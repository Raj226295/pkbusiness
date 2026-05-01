import fs from 'node:fs/promises'
import path from 'node:path'
import asyncHandler from '../middleware/asyncHandler.js'
import Appointment from '../models/Appointment.js'
import Document from '../models/Document.js'
import Notification from '../models/Notification.js'
import Payment from '../models/Payment.js'
import Service from '../models/Service.js'
import ServiceCatalog from '../models/ServiceCatalog.js'
import User from '../models/User.js'
import { createNotification } from '../utils/createNotification.js'
import {
  buildClientFolderName,
  ensureClientDocumentFolder,
  removeClientDocumentFolder,
  resolveStoredDocumentPath,
  serializeDocument,
  uploadsRoot,
} from '../utils/documentStorage.js'

function monthKey(value) {
  const date = new Date(value)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function formatMonthLabel(value) {
  return new Intl.DateTimeFormat('en-IN', {
    month: 'short',
  }).format(new Date(value))
}

function buildMonthBuckets(totalMonths = 6) {
  const now = new Date()
  const buckets = []

  for (let index = totalMonths - 1; index >= 0; index -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1)
    buckets.push({
      key: monthKey(date),
      label: formatMonthLabel(date),
      date,
    })
  }

  return buckets
}

function safeTrim(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function clampNumber(value, min, max, fallback) {
  const parsed = Number(value)

  if (!Number.isFinite(parsed)) {
    return fallback
  }

  return Math.min(Math.max(parsed, min), max)
}

function parseBoolean(value, fallback = false) {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()

    if (normalized === 'true') return true
    if (normalized === 'false') return false
  }

  return fallback
}

const validServiceStatuses = ['pending', 'approved', 'rejected', 'in progress', 'completed']

function resolveServiceStatus(value, fallback = 'pending') {
  return validServiceStatuses.includes(value) ? value : fallback
}

function isServiceActiveStatus(status = '') {
  return !['rejected', 'completed'].includes(status)
}

function isPathInsideUploadsRoot(targetPath = '') {
  const resolvedRoot = path.resolve(uploadsRoot)
  const resolvedTarget = path.resolve(targetPath)
  return resolvedTarget.startsWith(resolvedRoot)
}

async function removeStoredFile(targetPath = '') {
  if (!targetPath || !isPathInsideUploadsRoot(targetPath)) {
    return
  }

  try {
    await fs.unlink(targetPath)
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error
    }
  }
}

function resolveProfileImagePath(profileImage = '') {
  if (!profileImage.startsWith('/uploads/')) {
    return ''
  }

  return path.join(uploadsRoot, profileImage.replace(/^\/uploads\//, ''))
}

function resolveUploadAssetPath(filePath = '') {
  if (!filePath.startsWith('/uploads/')) {
    return ''
  }

  return path.join(uploadsRoot, filePath.replace(/^\/uploads\//, ''))
}

function mapAggregateById(records, transform = (record) => record) {
  return new Map(records.map((record) => [String(record._id), transform(record)]))
}

async function buildUserSummaryMaps() {
  const [documentCounts, serviceCounts, paymentTotals, appointmentCounts] = await Promise.all([
    Document.aggregate([{ $group: { _id: '$user', total: { $sum: 1 }, pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } } } }]),
    Service.aggregate([
      {
        $group: {
          _id: '$user',
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $in: ['$status', ['rejected', 'completed']] }, 0, 1] } },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        },
      },
    ]),
    Payment.aggregate([
      {
        $group: {
          _id: '$user',
          total: { $sum: 1 },
          paid: { $sum: { $cond: [{ $eq: ['$status', 'paid'] }, '$amount', 0] } },
          pending: {
            $sum: {
              $cond: [{ $or: [{ $eq: ['$status', 'pending'] }, { $eq: ['$verificationStatus', 'pending'] }] }, 1, 0],
            },
          },
        },
      },
    ]),
    Appointment.aggregate([
      {
        $group: {
          _id: '$user',
          total: { $sum: 1 },
          pending: {
            $sum: {
              $cond: [{ $in: ['$status', ['pending', 'approved', 'rescheduled', 'scheduled', 'confirmed']] }, 1, 0],
            },
          },
        },
      },
    ]),
  ])

  return {
    documentMap: mapAggregateById(documentCounts, (record) => ({
      total: record.total,
      pending: record.pending,
    })),
    serviceMap: mapAggregateById(serviceCounts, (record) => ({
      total: record.total,
      active: record.active,
      completed: record.completed,
    })),
    paymentMap: mapAggregateById(paymentTotals, (record) => ({
      total: record.total,
      paid: record.paid,
      pending: record.pending,
    })),
    appointmentMap: mapAggregateById(appointmentCounts, (record) => ({
      total: record.total,
      pending: record.pending,
    })),
  }
}

function normalizeServicePayload({ catalogItem = null, body = {} }) {
  const type = safeTrim(body.type || catalogItem?.name)
  const description = safeTrim(body.description || catalogItem?.description)
  const price = toNumber(body.price, catalogItem?.price ?? 0)

  return {
    type,
    description,
    price,
  }
}

function formatDateTimeLabel(value) {
  if (!value) {
    return ''
  }

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

const appointmentStatusAliases = {
  confirmed: 'approved',
  scheduled: 'rescheduled',
}

const validAppointmentStatuses = ['pending', 'approved', 'rejected', 'rescheduled', 'completed', 'cancelled']

function normalizeAppointmentStatus(value = 'pending', fallback = 'pending') {
  const normalizedValue = safeTrim(value, fallback).toLowerCase()
  const normalizedFallback = safeTrim(fallback, 'pending').toLowerCase()
  const canonicalValue = appointmentStatusAliases[normalizedValue] || normalizedValue
  const canonicalFallback = appointmentStatusAliases[normalizedFallback] || normalizedFallback

  if (validAppointmentStatuses.includes(canonicalValue)) {
    return canonicalValue
  }

  if (validAppointmentStatuses.includes(canonicalFallback)) {
    return canonicalFallback
  }

  return 'pending'
}

function toTitleCaseLabel(value = '') {
  return String(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function normalizeDocumentStatusForAdmin(status = '') {
  const normalized = safeTrim(status).toLowerCase()

  if (normalized === 'verified') {
    return 'approved'
  }

  if (['pending', 'approved', 'rejected'].includes(normalized)) {
    return normalized
  }

  return 'not submitted'
}

function normalizePaymentStatusForAdmin(payment = null) {
  if (!payment) {
    return 'not initiated'
  }

  const verificationStatus = safeTrim(payment.verificationStatus).toLowerCase()

  if (verificationStatus === 'verified') {
    return 'approved'
  }

  if (['pending', 'rejected'].includes(verificationStatus)) {
    return verificationStatus
  }

  const paymentStatus = safeTrim(payment.status).toLowerCase()

  if (['pending', 'paid', 'failed', 'rejected'].includes(paymentStatus)) {
    return paymentStatus
  }

  return 'not initiated'
}

function pickLatestRecordByService(records = [], selectedService = '', fieldName = 'serviceType') {
  const normalizedService = safeTrim(selectedService).toLowerCase()

  if (!normalizedService) {
    return records[0] || null
  }

  return (
    records.find((record) => safeTrim(record?.[fieldName]).toLowerCase() === normalizedService) ||
    records[0] ||
    null
  )
}

function deriveAppointmentServiceType(appointment, services = [], documents = [], payments = []) {
  return (
    safeTrim(appointment.serviceType) ||
    safeTrim(services[0]?.type) ||
    safeTrim(payments[0]?.serviceType) ||
    safeTrim(documents[0]?.serviceType) ||
    'General consultation'
  )
}

function buildAppointmentNotificationMessage({ status, serviceType, scheduledFor, rejectionReason }) {
  const formattedStatus = toTitleCaseLabel(status)
  const formattedDateTime = formatDateTimeLabel(scheduledFor)

  if (status === 'approved') {
    return `${serviceType} appointment approved for ${formattedDateTime}.`
  }

  if (status === 'rescheduled') {
    return `${serviceType} appointment rescheduled to ${formattedDateTime}.`
  }

  if (status === 'rejected') {
    return rejectionReason
      ? `${serviceType} appointment rejected. Reason: ${rejectionReason}`
      : `${serviceType} appointment rejected by admin.`
  }

  if (status === 'completed') {
    return `${serviceType} appointment marked as completed.`
  }

  if (status === 'cancelled') {
    return `${serviceType} appointment cancelled by admin.`
  }

  return `${serviceType} appointment is now ${formattedStatus.toLowerCase()}.`
}

function buildEmptyFolderSummary(user) {
  return {
    userId: user._id.toString(),
    name: user.name,
    email: user.email,
    folderName: buildClientFolderName(user),
    documentCount: 0,
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0,
    lastSubmittedAt: '',
  }
}

function createEmptyMessageThread(user) {
  const profile = typeof user.toObject === 'function' ? user.toObject() : { ...user }

  return {
    user: profile,
    items: [],
    unreadCount: 0,
    latestAt: profile.createdAt || new Date().toISOString(),
    latestSnippet: 'No recent queries yet.',
    latestKind: 'general',
  }
}

function ensureMessageThread(threadMap, user) {
  const key = String(user?._id || '')

  if (!key) {
    return null
  }

  if (!threadMap.has(key)) {
    threadMap.set(key, createEmptyMessageThread(user))
  }

  return threadMap.get(key)
}

function pushMessageThreadItem(threadMap, user, item) {
  const thread = ensureMessageThread(threadMap, user)

  if (!thread) {
    return
  }

  thread.items.push(item)
  thread.latestAt = item.createdAt || thread.latestAt
  thread.latestSnippet = item.message || thread.latestSnippet
  thread.latestKind = item.kind || thread.latestKind

  if (item.needsAction) {
    thread.unreadCount += 1
  }
}

export const getAdminOverview = asyncHandler(async (_req, res) => {
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  const monthBuckets = buildMonthBuckets(6)
  const rangeStart = monthBuckets[0].date

  const [
    totalUsers,
    totalDocuments,
    activeServices,
    completedServices,
    pendingDocuments,
    pendingPayments,
    pendingAppointments,
    appointmentsToday,
    totalRevenue,
    baselineUsers,
    recentDocuments,
    recentPayments,
    recentAppointments,
    recentServices,
    paidPayments,
    recentUsers,
  ] = await Promise.all([
    User.countDocuments({ role: 'user' }),
    Document.countDocuments(),
    Service.countDocuments({ status: { $nin: ['rejected', 'completed'] } }),
    Service.countDocuments({ status: 'completed' }),
    Document.countDocuments({ status: 'pending' }),
    Payment.countDocuments({
      $or: [{ status: 'pending' }, { verificationStatus: 'pending' }],
    }),
    Appointment.countDocuments({
      status: { $in: ['pending', 'approved', 'rescheduled', 'scheduled', 'confirmed'] },
    }),
    Appointment.countDocuments({ scheduledFor: { $gte: startOfDay, $lt: endOfDay } }),
    Payment.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    User.countDocuments({ role: 'user', createdAt: { $lt: rangeStart } }),
    Document.find()
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .limit(4),
    Payment.find()
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .limit(4),
    Appointment.find()
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .limit(4),
    Service.find()
      .populate('user', 'name')
      .sort({ updatedAt: -1 })
      .limit(4),
    Payment.find({ status: 'paid', paidAt: { $gte: rangeStart } }).select('amount paidAt createdAt'),
    User.find({ role: 'user', createdAt: { $gte: rangeStart } }).select('name createdAt'),
  ])

  const incomeLookup = new Map()
  for (const payment of paidPayments) {
    const key = monthKey(payment.paidAt || payment.createdAt)
    incomeLookup.set(key, (incomeLookup.get(key) || 0) + Number(payment.amount || 0))
  }

  const newUserLookup = new Map()
  for (const user of recentUsers) {
    const key = monthKey(user.createdAt)
    newUserLookup.set(key, (newUserLookup.get(key) || 0) + 1)
  }

  let runningUsers = baselineUsers
  const monthlyIncome = monthBuckets.map((bucket) => ({
    label: bucket.label,
    amount: incomeLookup.get(bucket.key) || 0,
  }))
  const userGrowth = monthBuckets.map((bucket) => {
    const newUsers = newUserLookup.get(bucket.key) || 0
    runningUsers += newUsers

    return {
      label: bucket.label,
      newUsers,
      totalUsers: runningUsers,
    }
  })

  const recentActivity = [
    ...recentDocuments.map((document) => ({
      id: `document-${document._id}`,
      kind: 'Document',
      title: document.title,
      subtitle: `${document.user?.name || 'Unknown client'} uploaded ${document.originalName || document.filename}`,
      status: document.status === 'verified' ? 'approved' : document.status,
      createdAt: document.createdAt,
      link: '/admin/documents',
    })),
    ...recentPayments.map((payment) => ({
      id: `payment-${payment._id}`,
      kind: 'Payment',
      title: payment.invoiceNumber,
      subtitle: `${payment.user?.name || 'Unknown client'} | ${payment.serviceType}`,
      status: payment.verificationStatus === 'verified' ? 'paid' : payment.verificationStatus || payment.status,
      createdAt: payment.createdAt,
      link: '/admin/payments',
    })),
    ...recentAppointments.map((appointment) => ({
      id: `appointment-${appointment._id}`,
      kind: 'Appointment',
      title: appointment.user?.name || 'Unknown client',
      subtitle: `Meeting request for ${new Intl.DateTimeFormat('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(appointment.scheduledFor))}`,
      status: appointment.status,
      createdAt: appointment.createdAt,
      link: '/admin/appointments',
    })),
    ...recentServices.map((service) => ({
      id: `service-${service._id}`,
      kind: 'Service',
      title: service.type,
      subtitle: `${service.user?.name || 'Unknown client'} | ${service.status}`,
      status: service.status,
      createdAt: service.updatedAt,
      link: '/admin/services',
    })),
  ]
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
    .slice(0, 8)

  res.json({
    overview: {
      totalUsers,
      newNotifications: pendingDocuments + pendingPayments + pendingAppointments,
      totalDocuments,
      activeServices,
      completedServices,
      pendingDocuments,
      pendingPayments,
      pendingAppointments,
      pendingRequests: pendingDocuments + pendingPayments + pendingAppointments,
      appointmentsToday,
      totalRevenue: totalRevenue[0]?.total || 0,
      monthlyIncome,
      userGrowth,
      recentActivity,
    },
  })
})

export const getAdminMessages = asyncHandler(async (_req, res) => {
  const userFields = 'name email phone companyName profileImage profileImageZoom profileImageOffsetX profileImageOffsetY createdAt'

  const [users, documents, appointments, payments, services, notifications] = await Promise.all([
    User.find({ role: 'user' }).select(userFields).sort({ createdAt: -1 }),
    Document.find({
      $or: [{ notes: { $exists: true, $ne: '' } }, { status: 'pending' }],
    })
      .populate('user', userFields)
      .sort({ createdAt: -1 }),
    Appointment.find({
      $or: [{ notes: { $exists: true, $ne: '' } }, { status: { $in: ['pending', 'scheduled', 'rescheduled'] } }],
    })
      .populate('user', userFields)
      .sort({ createdAt: -1 }),
    Payment.find({
      $or: [
        { description: { $exists: true, $ne: '' } },
        { verificationStatus: 'pending' },
        { status: 'pending' },
      ],
    })
      .populate('user', userFields)
      .sort({ createdAt: -1 }),
    Service.find({
      $or: [{ requestedByClient: true }, { notes: { $exists: true, $ne: '' } }],
    })
      .populate('user', userFields)
      .sort({ updatedAt: -1 }),
    Notification.find({ category: 'response' })
      .populate('user', userFields)
      .sort({ createdAt: -1 }),
  ])

  const threadMap = new Map()

  for (const user of users) {
    ensureMessageThread(threadMap, user)
  }

  for (const document of documents) {
    if (!document.user?._id) {
      continue
    }

    const fileName = document.originalName || document.filename
    pushMessageThreadItem(threadMap, document.user, {
      id: `document-${document._id}`,
      kind: 'document',
      direction: 'inbound',
      title: document.title || fileName,
      message: safeTrim(document.notes) || `Uploaded ${fileName} for ${document.serviceType}.`,
      createdAt: document.createdAt,
      status: document.status,
      needsAction: document.status === 'pending',
      meta: {
        serviceType: document.serviceType,
        fileName,
      },
    })
  }

  for (const appointment of appointments) {
    if (!appointment.user?._id) {
      continue
    }

    pushMessageThreadItem(threadMap, appointment.user, {
      id: `appointment-${appointment._id}`,
      kind: 'appointment',
      direction: 'inbound',
      title: 'Appointment request',
      message:
        safeTrim(appointment.notes) || `Requested consultation for ${formatDateTimeLabel(appointment.scheduledFor)}.`,
      createdAt: appointment.createdAt,
      status: appointment.status,
      needsAction: ['pending', 'scheduled', 'rescheduled'].includes(appointment.status),
      meta: {
        scheduledFor: appointment.scheduledFor,
      },
    })
  }

  for (const payment of payments) {
    if (!payment.user?._id) {
      continue
    }

    pushMessageThreadItem(threadMap, payment.user, {
      id: `payment-${payment._id}`,
      kind: 'payment',
      direction: 'inbound',
      title: payment.invoiceNumber,
      message:
        safeTrim(payment.description) || `Uploaded payment proof for ${payment.serviceType}.`,
      createdAt: payment.createdAt,
      status: payment.verificationStatus || payment.status,
      needsAction: payment.verificationStatus === 'pending' || payment.status === 'pending',
      meta: {
        amount: payment.amount,
        serviceType: payment.serviceType,
        screenshotUrl: payment.screenshotUrl,
      },
    })
  }

  for (const service of services) {
    if (!service.user?._id) {
      continue
    }

    pushMessageThreadItem(threadMap, service.user, {
      id: `service-${service._id}`,
      kind: 'service',
      direction: 'inbound',
      title: service.type,
      message:
        safeTrim(service.notes) ||
        `${service.type} needs a service-side review from the admin team.`,
      createdAt: service.updatedAt || service.createdAt,
      status: service.status,
      needsAction: service.requestedByClient || (service.status === 'pending' && Boolean(safeTrim(service.notes))),
      meta: {
        priority: service.priority,
      },
    })
  }

  for (const notification of notifications) {
    if (!notification.user?._id) {
      continue
    }

    pushMessageThreadItem(threadMap, notification.user, {
      id: `notification-${notification._id}`,
      kind: notification.category || 'response',
      direction: 'outbound',
      title: notification.title,
      message: notification.message,
      createdAt: notification.createdAt,
      status: notification.read ? 'read' : 'sent',
      needsAction: false,
      meta: {
        actionLabel: notification.actionLabel,
        link: notification.link,
      },
    })
  }

  const threads = Array.from(threadMap.values())
    .map((thread) => ({
      ...thread,
      items: [...thread.items].sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt)),
    }))
    .map((thread) => ({
      ...thread,
      latestAt: thread.items[0]?.createdAt || thread.latestAt,
      latestSnippet: thread.items[0]?.message || thread.latestSnippet,
      latestKind: thread.items[0]?.kind || thread.latestKind,
    }))
    .sort((left, right) => {
      if (right.unreadCount !== left.unreadCount) {
        return right.unreadCount - left.unreadCount
      }

      return new Date(right.latestAt) - new Date(left.latestAt)
    })

  res.json({
    summary: {
      totalThreads: threads.length,
      unreadThreads: threads.filter((thread) => thread.unreadCount > 0).length,
      unreadItems: threads.reduce((total, thread) => total + thread.unreadCount, 0),
    },
    threads,
  })
})

export const getAllUsers = asyncHandler(async (_req, res) => {
  const users = await User.find().select('-password').sort({ createdAt: -1 })
  const { documentMap, serviceMap, paymentMap, appointmentMap } = await buildUserSummaryMaps()

  res.json({
    users: users.map((user) => ({
      ...user.toObject(),
      summary: {
        documents: documentMap.get(String(user._id))?.total || 0,
        pendingDocuments: documentMap.get(String(user._id))?.pending || 0,
        services: serviceMap.get(String(user._id))?.total || 0,
        activeServices: serviceMap.get(String(user._id))?.active || 0,
        completedServices: serviceMap.get(String(user._id))?.completed || 0,
        payments: paymentMap.get(String(user._id))?.total || 0,
        paidAmount: paymentMap.get(String(user._id))?.paid || 0,
        pendingPayments: paymentMap.get(String(user._id))?.pending || 0,
        appointments: appointmentMap.get(String(user._id))?.total || 0,
        pendingAppointments: appointmentMap.get(String(user._id))?.pending || 0,
      },
    })),
  })
})

export const getUserDetails = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-password')

  if (!user) {
    res.status(404)
    throw new Error('User not found')
  }

  const [documents, services, payments, appointments, notifications] = await Promise.all([
    Document.find({ user: user._id })
      .populate('uploadedBy', 'name email role')
      .populate('reviewedBy', 'name email role')
      .sort({ createdAt: -1 }),
    Service.find({ user: user._id }).populate('catalogService').sort({ updatedAt: -1 }),
    Payment.find({ user: user._id }).populate('verifiedBy', 'name').populate('service', 'type price status').sort({ createdAt: -1 }),
    Appointment.find({ user: user._id }).sort({ scheduledFor: -1 }),
    Notification.find({ user: user._id }).sort({ createdAt: -1 }).limit(8),
  ])

  res.json({
    user: {
      ...user.toObject(),
      documents: documents.map((document) => serializeDocument(document, 'admin')),
      services,
      payments,
      appointments: appointments.map((appointment) => ({
        ...appointment.toObject(),
        status: normalizeAppointmentStatus(appointment.status),
        serviceType: appointment.serviceType || 'General consultation',
        statusLabel: toTitleCaseLabel(normalizeAppointmentStatus(appointment.status)),
      })),
      notifications,
    },
  })
})

export const createUser = asyncHandler(async (req, res) => {
  const name = safeTrim(req.body.name)
  const email = safeTrim(req.body.email).toLowerCase()
  const phone = safeTrim(req.body.phone)
  const password = safeTrim(req.body.password)
  const companyName = safeTrim(req.body.companyName)

  if (!name || !email || !phone || !password) {
    res.status(400)
    throw new Error('Name, email, phone, and password are required')
  }

  const existingUser = await User.findOne({ email })

  if (existingUser) {
    res.status(400)
    throw new Error('A user already exists with this email')
  }

  const user = await User.create({
    name,
    email,
    phone,
    password,
    companyName,
    role: 'user',
  })

  await ensureClientDocumentFolder(user)

  res.status(201).json({
    message: 'User created successfully',
    user: {
      ...user.toObject(),
      password: undefined,
    },
  })
})

export const updateUserBlockStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)

  if (!user) {
    res.status(404)
    throw new Error('User not found')
  }

  if (user.role === 'admin') {
    res.status(400)
    throw new Error('Admin accounts cannot be blocked from this panel')
  }

  const shouldBlock = typeof req.body.isBlocked === 'boolean' ? req.body.isBlocked : !user.isBlocked
  user.isBlocked = shouldBlock
  user.blockedAt = shouldBlock ? new Date() : null
  await user.save()

  await createNotification({
    userId: user._id,
    title: shouldBlock ? 'Account temporarily blocked' : 'Account access restored',
    message: shouldBlock
      ? 'Your account has been blocked by the admin team. Please contact support for assistance.'
      : 'Your account has been unblocked and is active again.',
    category: 'security',
    link: '/dashboard/profile',
    actionLabel: 'Open profile',
  })

  res.json({
    message: shouldBlock ? 'User blocked successfully' : 'User unblocked successfully',
    user,
  })
})

export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id)

  if (!user) {
    res.status(404)
    throw new Error('User not found')
  }

  if (user.role === 'admin') {
    res.status(400)
    throw new Error('Admin accounts cannot be deleted from this panel')
  }

  const documents = await Document.find({ user: user._id })

  for (const document of documents) {
    await removeStoredFile(resolveStoredDocumentPath(document))
  }

  await removeStoredFile(resolveProfileImagePath(user.profileImage))

  await Promise.all([
    Document.deleteMany({ user: user._id }),
    Service.deleteMany({ user: user._id }),
    Payment.deleteMany({ user: user._id }),
    Appointment.deleteMany({ user: user._id }),
    Notification.deleteMany({ user: user._id }),
    User.deleteOne({ _id: user._id }),
  ])

  await removeClientDocumentFolder(user)

  res.json({ message: 'User and related records deleted successfully' })
})

export const sendUserMessage = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('name role')

  if (!user) {
    res.status(404)
    throw new Error('User not found')
  }

  if (user.role === 'admin') {
    res.status(400)
    throw new Error('Messages can only be sent to client accounts')
  }

  const title = safeTrim(req.body.title, 'Admin update')
  const message = safeTrim(req.body.message)
  const link = safeTrim(req.body.link, '/dashboard/notifications')

  if (!message) {
    res.status(400)
    throw new Error('Message text is required')
  }

  const notification = await createNotification({
    userId: user._id,
    title,
    message,
    category: 'response',
    link,
    actionLabel: 'Open update',
  })

  res.status(201).json({
    message: 'Response sent successfully',
    notification,
  })
})

export const getAllDocuments = asyncHandler(async (_req, res) => {
  const [documents, clientUsers] = await Promise.all([
    Document.find()
      .populate('user', 'name email role')
      .populate('uploadedBy', 'name email role')
      .populate('reviewedBy', 'name email role')
      .sort({ createdAt: -1 }),
    User.find({ role: 'user' }).select('name email role').sort({ createdAt: -1 }),
  ])

  await Promise.all(clientUsers.map((user) => ensureClientDocumentFolder(user)))

  const serializedDocuments = documents.map((document) => serializeDocument(document, 'admin'))
  const folderMap = new Map(clientUsers.map((user) => [user._id.toString(), buildEmptyFolderSummary(user)]))

  for (const document of serializedDocuments) {
    const user = document.user

    if (!user?._id) {
      continue
    }

    const key = user._id.toString()
    const current = folderMap.get(key) || buildEmptyFolderSummary(user)

    current.documentCount += 1
    current.folderName = document.storageFolder || current.folderName
    current.lastSubmittedAt =
      !current.lastSubmittedAt || new Date(document.createdAt) > new Date(current.lastSubmittedAt)
        ? document.createdAt
        : current.lastSubmittedAt

    if (document.status === 'pending') current.pendingCount += 1
    if (document.status === 'approved') current.approvedCount += 1
    if (document.status === 'rejected') current.rejectedCount += 1

    folderMap.set(key, current)
  }

  const folders = Array.from(folderMap.values()).sort((left, right) => {
    if (!left.lastSubmittedAt && !right.lastSubmittedAt) {
      return left.name.localeCompare(right.name)
    }

    if (!left.lastSubmittedAt) {
      return 1
    }

    if (!right.lastSubmittedAt) {
      return -1
    }

    return new Date(right.lastSubmittedAt) - new Date(left.lastSubmittedAt)
  })

  res.json({ documents: serializedDocuments, folders })
})

export const reviewDocument = asyncHandler(async (req, res) => {
  const document = await Document.findById(req.params.id)

  if (!document) {
    res.status(404)
    throw new Error('Document not found')
  }

  const requestedStatus = req.body.status === 'verified' ? 'approved' : req.body.status

  if (requestedStatus && !['pending', 'approved', 'rejected'].includes(requestedStatus)) {
    res.status(400)
    throw new Error('Invalid document status')
  }

  document.status = requestedStatus || document.status
  document.remarks = safeTrim(req.body.remarks, document.remarks || '')
  document.reviewedBy = req.user._id
  document.reviewedAt = new Date()
  await document.save()

  await createNotification({
    userId: document.user,
    title: 'Document review updated',
    message: `${document.title} is now marked as ${document.status}.`,
    category: 'document',
    link: '/dashboard/documents',
    fileUrl: document.fileUrl,
    actionLabel: 'View history',
  })

  await document.populate([
    { path: 'user', select: 'name email role' },
    { path: 'uploadedBy', select: 'name email role' },
    { path: 'reviewedBy', select: 'name email role' },
  ])

  res.json({ message: 'Document reviewed successfully', document: serializeDocument(document, 'admin') })
})

export const deleteDocument = asyncHandler(async (req, res) => {
  const document = await Document.findById(req.params.id).populate('user', 'name email role')

  if (!document) {
    res.status(404)
    throw new Error('Document not found')
  }

  await removeStoredFile(resolveStoredDocumentPath(document))
  await document.deleteOne()

  if (document.user?._id) {
    await createNotification({
      userId: document.user._id,
      title: 'Document removed',
      message: `${document.title || document.originalName || 'A document'} was removed from your folder by admin.`,
      category: 'document',
      link: '/dashboard/documents',
      actionLabel: 'Open documents',
    })
  }

  res.json({ message: 'Document deleted successfully' })
})

export const getServiceCatalog = asyncHandler(async (_req, res) => {
  const services = await ServiceCatalog.find().sort({ name: 1 })
  res.json({ services })
})

export const createServiceCatalogItem = asyncHandler(async (req, res) => {
  const name = safeTrim(req.body.name)
  const description = safeTrim(req.body.description)
  const price = toNumber(req.body.price, NaN)
  const image = req.file ? `/uploads/${req.file.filename}` : ''
  const imageZoom = clampNumber(req.body.imageZoom, 1, 2.5, 1)
  const imageOffsetX = clampNumber(req.body.imageOffsetX, -35, 35, 0)
  const imageOffsetY = clampNumber(req.body.imageOffsetY, -35, 35, 0)

  if (!name || Number.isNaN(price)) {
    res.status(400)
    throw new Error('Service name and price are required')
  }

  if (req.file && !req.file.mimetype.startsWith('image/')) {
    res.status(400)
    throw new Error('Only image files are allowed for service artwork')
  }

  const existing = await ServiceCatalog.findOne({ name })

  if (existing) {
    res.status(400)
    throw new Error('A service with this name already exists')
  }

  const service = await ServiceCatalog.create({
    name,
    description,
    price,
    isActive: parseBoolean(req.body.isActive, true),
    image,
    imageZoom,
    imageOffsetX,
    imageOffsetY,
  })

  res.status(201).json({ message: 'Service added successfully', service })
})

export const updateServiceCatalogItem = asyncHandler(async (req, res) => {
  const service = await ServiceCatalog.findById(req.params.id)

  if (!service) {
    res.status(404)
    throw new Error('Service not found')
  }

  if (req.file && !req.file.mimetype.startsWith('image/')) {
    res.status(400)
    throw new Error('Only image files are allowed for service artwork')
  }

  const previousImage = service.image
  const nextImage = req.file ? `/uploads/${req.file.filename}` : service.image

  service.name = safeTrim(req.body.name, service.name)
  service.description = safeTrim(req.body.description, service.description)
  service.price = toNumber(req.body.price, service.price)
  service.isActive = parseBoolean(req.body.isActive, service.isActive)
  service.image = nextImage
  service.imageZoom = clampNumber(req.body.imageZoom, 1, 2.5, service.imageZoom ?? 1)
  service.imageOffsetX = clampNumber(req.body.imageOffsetX, -35, 35, service.imageOffsetX ?? 0)
  service.imageOffsetY = clampNumber(req.body.imageOffsetY, -35, 35, service.imageOffsetY ?? 0)
  await service.save()

  if (req.file && previousImage && previousImage !== nextImage) {
    await removeStoredFile(resolveUploadAssetPath(previousImage))
  }

  res.json({ message: 'Service updated successfully', service })
})

export const deleteServiceCatalogItem = asyncHandler(async (req, res) => {
  const service = await ServiceCatalog.findById(req.params.id)

  if (!service) {
    res.status(404)
    throw new Error('Service not found')
  }

  await Service.updateMany({ catalogService: service._id }, { $set: { catalogService: null } })
  await removeStoredFile(resolveUploadAssetPath(service.image))
  await service.deleteOne()

  res.json({ message: 'Service deleted successfully' })
})

export const getAllServices = asyncHandler(async (_req, res) => {
  const [assignments, catalog] = await Promise.all([
    Service.find()
      .populate('user', 'name email')
      .populate('catalogService')
      .sort({ updatedAt: -1 }),
    ServiceCatalog.find().sort({ name: 1 }),
  ])

  res.json({ services: assignments, catalog })
})

export const assignService = asyncHandler(async (req, res) => {
  const { userId, priority, notes, catalogServiceId } = req.body

  if (!userId) {
    res.status(400)
    throw new Error('User is required')
  }

  let catalogItem = null

  if (catalogServiceId) {
    catalogItem = await ServiceCatalog.findById(catalogServiceId)

    if (!catalogItem) {
      res.status(404)
      throw new Error('Selected service could not be found')
    }
  }

  const payload = normalizeServicePayload({
    catalogItem,
    body: req.body,
  })

  if (!payload.type) {
    res.status(400)
    throw new Error('Service name is required')
  }

  const requestedStatus = safeTrim(req.body.status, 'pending')
  const status = resolveServiceStatus(requestedStatus, 'pending')
  const adminRemarks = safeTrim(req.body.adminRemarks)

  const service = await Service.create({
    user: userId,
    catalogService: catalogItem?._id || null,
    type: payload.type,
    description: payload.description,
    price: payload.price,
    status,
    priority: priority || 'medium',
    notes: safeTrim(notes),
    adminRemarks,
    requestedByClient: typeof req.body.requestedByClient === 'boolean' ? req.body.requestedByClient : false,
    completedAt: status === 'completed' ? new Date() : null,
  })

  await createNotification({
    userId,
    title: 'New service assigned',
    message: `${payload.type} has been added to your dashboard.`,
    category: 'service',
    link: '/dashboard/services',
    actionLabel: 'Open service tracker',
  })

  res.status(201).json({ message: 'Service assigned successfully', service })
})

export const updateService = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id)

  if (!service) {
    res.status(404)
    throw new Error('Service not found')
  }

  const nextStatus = resolveServiceStatus(safeTrim(req.body.status, service.status) || service.status, service.status)

  if (!validServiceStatuses.includes(nextStatus)) {
    res.status(400)
    throw new Error('Invalid service status')
  }

  service.status = nextStatus
  service.adminRemarks = safeTrim(req.body.adminRemarks, service.adminRemarks)
  service.notes = safeTrim(req.body.notes, service.notes)
  service.description = safeTrim(req.body.description, service.description)
  service.price = toNumber(req.body.price, service.price)
  if (typeof req.body.requestedByClient === 'boolean') {
    service.requestedByClient = req.body.requestedByClient
  }
  service.completedAt = service.status === 'completed' ? service.completedAt || new Date() : null
  await service.save()

  await createNotification({
    userId: service.user,
    title: 'Service status updated',
    message: `${service.type} is now ${service.status}.`,
    category: 'service',
    link: '/dashboard/services',
    actionLabel: 'Open service tracker',
  })

  res.json({ message: 'Service updated successfully', service })
})

export const createAdminAppointment = asyncHandler(async (req, res) => {
  const userId = safeTrim(req.body.userId)
  const scheduledFor = req.body.scheduledFor
  const serviceType = safeTrim(req.body.serviceType, 'General consultation')
  const notes = safeTrim(req.body.notes)
  const adminNotes = safeTrim(req.body.adminNotes)
  const status = normalizeAppointmentStatus(req.body.status, 'approved')
  const rejectionReason = safeTrim(req.body.rejectionReason)

  if (!userId || !scheduledFor) {
    res.status(400)
    throw new Error('User, date, and time are required')
  }

  if (status === 'rejected' && !rejectionReason) {
    res.status(400)
    throw new Error('A rejection reason is required')
  }

  const user = await User.findById(userId).select('name role')

  if (!user || user.role === 'admin') {
    res.status(404)
    throw new Error('Client account not found')
  }

  const appointment = await Appointment.create({
    user: userId,
    scheduledFor: new Date(scheduledFor),
    serviceType,
    notes,
    adminNotes,
    status,
    rejectionReason,
  })

  await createNotification({
    userId,
    title: 'Appointment booked by admin',
    message: buildAppointmentNotificationMessage({
      status,
      serviceType,
      scheduledFor,
      rejectionReason,
    }),
    category: 'appointment',
    link: '/dashboard/appointments',
    actionLabel: 'Open appointments',
  })

  res.status(201).json({
    message: 'Appointment created successfully',
    appointment,
  })
})

export const getAllAppointments = asyncHandler(async (_req, res) => {
  const appointments = await Appointment.find().populate('user', 'name email phone').sort({ scheduledFor: -1, createdAt: -1 })

  const userIds = Array.from(
    new Set(
      appointments
        .map((appointment) => appointment.user?._id?.toString())
        .filter(Boolean),
    ),
  )

  const [documents, payments, services] = await Promise.all([
    Document.find({ user: { $in: userIds } }).select('user serviceType status createdAt').sort({ createdAt: -1 }),
    Payment.find({ user: { $in: userIds } })
      .select('user serviceType status verificationStatus createdAt paidAt verifiedAt')
      .sort({ createdAt: -1 }),
    Service.find({ user: { $in: userIds } }).select('user type status updatedAt createdAt').sort({ updatedAt: -1, createdAt: -1 }),
  ])

  const documentsByUser = new Map()
  const paymentsByUser = new Map()
  const servicesByUser = new Map()

  for (const document of documents) {
    const key = document.user?.toString()

    if (!key) continue
    if (!documentsByUser.has(key)) documentsByUser.set(key, [])
    documentsByUser.get(key).push(document)
  }

  for (const payment of payments) {
    const key = payment.user?.toString()

    if (!key) continue
    if (!paymentsByUser.has(key)) paymentsByUser.set(key, [])
    paymentsByUser.get(key).push(payment)
  }

  for (const service of services) {
    const key = service.user?.toString()

    if (!key) continue
    if (!servicesByUser.has(key)) servicesByUser.set(key, [])
    servicesByUser.get(key).push(service)
  }

  const enrichedAppointments = appointments.map((appointment) => {
    const appointmentObject = appointment.toObject()
    const userKey = appointment.user?._id?.toString() || ''
    const relatedDocuments = documentsByUser.get(userKey) || []
    const relatedPayments = paymentsByUser.get(userKey) || []
    const relatedServices = servicesByUser.get(userKey) || []
    const status = normalizeAppointmentStatus(appointmentObject.status)
    const selectedService = deriveAppointmentServiceType(
      appointmentObject,
      relatedServices,
      relatedDocuments,
      relatedPayments,
    )
    const relevantDocument = pickLatestRecordByService(relatedDocuments, selectedService, 'serviceType')
    const relevantPayment = pickLatestRecordByService(relatedPayments, selectedService, 'serviceType')

    return {
      ...appointmentObject,
      status,
      statusLabel: toTitleCaseLabel(status),
      serviceType: appointmentObject.serviceType || selectedService,
      selectedService,
      message: appointmentObject.notes || '',
      documentStatus: normalizeDocumentStatusForAdmin(relevantDocument?.status),
      paymentStatus: normalizePaymentStatusForAdmin(relevantPayment),
    }
  })

  const summary = {
    total: enrichedAppointments.length,
    pending: enrichedAppointments.filter((appointment) => appointment.status === 'pending').length,
    approved: enrichedAppointments.filter((appointment) => appointment.status === 'approved').length,
    rescheduled: enrichedAppointments.filter((appointment) => appointment.status === 'rescheduled').length,
    rejected: enrichedAppointments.filter((appointment) => appointment.status === 'rejected').length,
    completed: enrichedAppointments.filter((appointment) => appointment.status === 'completed').length,
    cancelled: enrichedAppointments.filter((appointment) => appointment.status === 'cancelled').length,
  }

  res.json({ appointments: enrichedAppointments, summary })
})

export const updateAppointment = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id)

  if (!appointment) {
    res.status(404)
    throw new Error('Appointment not found')
  }

  if (req.body.scheduledFor) {
    appointment.scheduledFor = new Date(req.body.scheduledFor)
  }

  const nextStatus = normalizeAppointmentStatus(req.body.status, appointment.status)
  const nextRejectionReason =
    req.body.rejectionReason !== undefined
      ? safeTrim(req.body.rejectionReason)
      : safeTrim(appointment.rejectionReason)

  if (nextStatus === 'rejected' && !nextRejectionReason) {
    res.status(400)
    throw new Error('A rejection reason is required')
  }

  if (nextStatus === 'rescheduled' && !req.body.scheduledFor && normalizeAppointmentStatus(appointment.status) !== 'rescheduled') {
    res.status(400)
    throw new Error('A new appointment date and time are required to reschedule')
  }

  appointment.status = nextStatus
  if (req.body.serviceType !== undefined) {
    appointment.serviceType = safeTrim(req.body.serviceType, appointment.serviceType || 'General consultation')
  }
  appointment.adminNotes = safeTrim(req.body.adminNotes, appointment.adminNotes)
  appointment.rejectionReason = nextStatus === 'rejected' ? nextRejectionReason : ''
  await appointment.save()

  await createNotification({
    userId: appointment.user,
    title: 'Appointment updated',
    message: buildAppointmentNotificationMessage({
      status: appointment.status,
      serviceType: appointment.serviceType || 'General consultation',
      scheduledFor: appointment.scheduledFor,
      rejectionReason: appointment.rejectionReason,
    }),
    category: 'appointment',
    link: '/dashboard/appointments',
    actionLabel: 'Open appointments',
  })

  res.json({
    message: 'Appointment updated successfully',
    appointment: {
      ...appointment.toObject(),
      status: normalizeAppointmentStatus(appointment.status),
      serviceType: appointment.serviceType || 'General consultation',
      statusLabel: toTitleCaseLabel(normalizeAppointmentStatus(appointment.status)),
    },
  })
})

export const getAllPayments = asyncHandler(async (_req, res) => {
  const payments = await Payment.find()
    .populate('user', 'name email phone')
    .populate('service', 'type price status')
    .populate('verifiedBy', 'name')
    .sort({ createdAt: -1 })

  const summary = {
    totalEarnings: payments
      .filter((payment) => payment.status === 'paid')
      .reduce((total, payment) => total + Number(payment.amount || 0), 0),
    pending: payments.filter(
      (payment) => payment.status === 'pending' || payment.verificationStatus === 'pending',
    ).length,
    verified: payments.filter((payment) => payment.verificationStatus === 'verified').length,
    rejected: payments.filter((payment) => payment.verificationStatus === 'rejected').length,
  }

  res.json({ payments, summary })
})

export const updatePayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id)

  if (!payment) {
    res.status(404)
    throw new Error('Payment not found')
  }

  if (req.body.transactionId !== undefined) {
    payment.transactionId = safeTrim(req.body.transactionId, payment.transactionId)
  }

  if (req.body.reviewRemarks !== undefined) {
    payment.reviewRemarks = safeTrim(req.body.reviewRemarks, payment.reviewRemarks)
  }

  if (req.body.verificationStatus) {
    if (!['pending', 'verified', 'rejected'].includes(req.body.verificationStatus)) {
      res.status(400)
      throw new Error('Invalid payment verification status')
    }

    payment.verificationStatus = req.body.verificationStatus

    if (req.body.verificationStatus === 'verified') {
      payment.status = 'paid'
      payment.verifiedBy = req.user._id
      payment.verifiedAt = new Date()
      payment.paidAt = payment.paidAt || new Date()
    }

    if (req.body.verificationStatus === 'rejected') {
      payment.status = 'rejected'
      payment.verifiedBy = req.user._id
      payment.verifiedAt = new Date()
    }

    if (req.body.verificationStatus === 'pending') {
      payment.status = 'pending'
      payment.verifiedBy = null
      payment.verifiedAt = null
      payment.paidAt = payment.paymentMethod === 'online' ? payment.paidAt : null
    }
  }

  if (req.body.status) {
    payment.status = req.body.status
  }

  await payment.save()
  let movedServiceToInProgress = false

  if (payment.verificationStatus === 'verified' && payment.service) {
    const service = await Service.findById(payment.service)

    if (service && isServiceActiveStatus(service.status) && service.status !== 'in progress') {
      service.status = 'in progress'
      service.completedAt = null
      await service.save()
      movedServiceToInProgress = true
    }
  }

  const paymentStatusMessage =
    payment.verificationStatus === 'verified'
      ? movedServiceToInProgress
        ? `${payment.invoiceNumber} has been verified successfully. ${payment.serviceType} is now in progress.`
        : `${payment.invoiceNumber} has been verified successfully.`
      : payment.verificationStatus === 'rejected'
        ? `${payment.invoiceNumber} has been rejected. Please review the admin remarks.`
        : `${payment.invoiceNumber} is now marked as ${payment.status}.`

  await createNotification({
    userId: payment.user,
    title: 'Payment status updated',
    message: paymentStatusMessage,
    category: 'payment',
    link: '/dashboard/payments',
    actionLabel: 'Open payments',
  })

  res.json({ message: 'Payment updated successfully', payment })
})
