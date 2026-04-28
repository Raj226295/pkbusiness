import asyncHandler from '../middleware/asyncHandler.js'
import Appointment from '../models/Appointment.js'
import Document from '../models/Document.js'
import Payment from '../models/Payment.js'
import Service from '../models/Service.js'
import User from '../models/User.js'
import { createNotification } from '../utils/createNotification.js'

export const getAdminOverview = asyncHandler(async (_req, res) => {
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

  const [totalUsers, activeServices, pendingDocuments, pendingPayments, appointmentsToday, pendingAppointments] =
    await Promise.all([
      User.countDocuments({ role: 'user' }),
      Service.countDocuments({ status: { $ne: 'completed' } }),
      Document.countDocuments({ status: 'pending' }),
      Payment.countDocuments({ status: { $ne: 'paid' } }),
      Appointment.countDocuments({ scheduledFor: { $gte: startOfDay, $lt: endOfDay } }),
      Appointment.countDocuments({ status: { $in: ['scheduled', 'confirmed'] } }),
    ])

  res.json({
    overview: {
      totalUsers,
      activeServices,
      pendingDocuments,
      pendingPayments,
      appointmentsToday,
      pendingAppointments,
    },
  })
})

export const getAllUsers = asyncHandler(async (_req, res) => {
  const users = await User.find().select('-password').sort({ createdAt: -1 })
  res.json({ users })
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

  res.json({
    message: shouldBlock ? 'User blocked successfully' : 'User unblocked successfully',
    user,
  })
})

export const getAllDocuments = asyncHandler(async (_req, res) => {
  const documents = await Document.find()
    .populate('user', 'name email')
    .populate('uploadedBy', 'name email role')
    .sort({ createdAt: -1 })
  res.json({ documents })
})

export const reviewDocument = asyncHandler(async (req, res) => {
  const document = await Document.findById(req.params.id)

  if (!document) {
    res.status(404)
    throw new Error('Document not found')
  }

  document.status = req.body.status || document.status
  document.remarks = req.body.remarks || ''
  await document.save()

  await createNotification({
    userId: document.user,
    title: 'Document review updated',
    message: `${document.title} is now marked as ${document.status}.`,
    category: 'document',
    link: '/dashboard/documents',
    fileUrl: document.fileUrl,
    actionLabel: 'Open document',
  })

  res.json({ message: 'Document reviewed successfully', document })
})

export const getAllServices = asyncHandler(async (_req, res) => {
  const services = await Service.find().populate('user', 'name email').sort({ updatedAt: -1 })
  res.json({ services })
})

export const assignService = asyncHandler(async (req, res) => {
  const { userId, type, priority, notes } = req.body

  if (!userId || !type) {
    res.status(400)
    throw new Error('User and service type are required')
  }

  const service = await Service.create({
    user: userId,
    type,
    priority: priority || 'medium',
    notes,
  })

  await createNotification({
    userId,
    title: 'New service assigned',
    message: `${type} has been added to your dashboard.`,
  })

  res.status(201).json({ message: 'Service assigned successfully', service })
})

export const updateService = asyncHandler(async (req, res) => {
  const service = await Service.findById(req.params.id)

  if (!service) {
    res.status(404)
    throw new Error('Service not found')
  }

  service.status = req.body.status || service.status
  service.adminRemarks = req.body.adminRemarks || ''
  await service.save()

  await createNotification({
    userId: service.user,
    title: 'Service status updated',
    message: `${service.type} is now ${service.status}.`,
  })

  res.json({ message: 'Service updated successfully', service })
})

export const getAllAppointments = asyncHandler(async (_req, res) => {
  const appointments = await Appointment.find().populate('user', 'name email').sort({ scheduledFor: -1 })
  res.json({ appointments })
})

export const updateAppointment = asyncHandler(async (req, res) => {
  const appointment = await Appointment.findById(req.params.id)

  if (!appointment) {
    res.status(404)
    throw new Error('Appointment not found')
  }

  appointment.status = req.body.status || appointment.status
  await appointment.save()

  await createNotification({
    userId: appointment.user,
    title: 'Appointment updated',
    message: `Your consultation is now marked as ${appointment.status}.`,
  })

  res.json({ message: 'Appointment updated successfully', appointment })
})

export const getAllPayments = asyncHandler(async (_req, res) => {
  const payments = await Payment.find().populate('user', 'name email').sort({ createdAt: -1 })
  res.json({ payments })
})

export const updatePayment = asyncHandler(async (req, res) => {
  const payment = await Payment.findById(req.params.id)

  if (!payment) {
    res.status(404)
    throw new Error('Payment not found')
  }

  payment.status = req.body.status || payment.status
  payment.transactionId = req.body.transactionId || payment.transactionId

  if (payment.status === 'paid' && !payment.paidAt) {
    payment.paidAt = new Date()
  }

  await payment.save()

  await createNotification({
    userId: payment.user,
    title: 'Payment status updated',
    message: `${payment.invoiceNumber} is now marked as ${payment.status}.`,
  })

  res.json({ message: 'Payment updated successfully', payment })
})
