import crypto from 'node:crypto'
import Razorpay from 'razorpay'
import asyncHandler from '../middleware/asyncHandler.js'
import Document from '../models/Document.js'
import Payment from '../models/Payment.js'
import Service from '../models/Service.js'
import { createNotification } from '../utils/createNotification.js'

function buildInvoiceNumber() {
  return `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`
}

function getRazorpayClient() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    return null
  }

  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  })
}

function safeTrim(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback
}

function buildUploadUrl(req, file) {
  if (!file?.filename) {
    return ''
  }

  return `${req.protocol}://${req.get('host')}/uploads/${file.filename}`
}

async function markServiceInProgressAfterPayment(serviceId = '') {
  if (!serviceId) {
    return false
  }

  const service = await Service.findById(serviceId)

  if (!service || ['rejected', 'completed'].includes(service.status) || service.status === 'in progress') {
    return false
  }

  service.status = 'in progress'
  service.completedAt = null
  await service.save()
  return true
}

export const createPayment = asyncHandler(async (req, res) => {
  const serviceId = safeTrim(req.body.serviceId)
  const description = safeTrim(req.body.description)
  const transactionId = safeTrim(req.body.transactionId)
  const paymentMethod = req.body.paymentMethod === 'manual' ? 'manual' : 'online'

  if (!serviceId) {
    res.status(400)
    throw new Error('Please choose a service for payment')
  }

  if (paymentMethod === 'manual' && !req.file) {
    res.status(400)
    throw new Error('Please upload a payment screenshot for manual verification')
  }

  if (paymentMethod === 'manual' && !transactionId) {
    res.status(400)
    throw new Error('Please enter the transaction ID or UPI reference number')
  }

  const service = await Service.findOne({
    _id: serviceId,
    user: req.user._id,
  })

  if (!service) {
    res.status(404)
    throw new Error('Selected service could not be found')
  }

  if (Number(service.price || 0) <= 0) {
    res.status(400)
    throw new Error('Admin has not set the service price yet')
  }

  if (service.status === 'rejected') {
    res.status(400)
    throw new Error('This service was rejected by admin. Please review the remarks first')
  }

  if (service.status === 'completed') {
    res.status(400)
    throw new Error('This service is already completed')
  }

  if (!['approved', 'in progress'].includes(service.status)) {
    res.status(400)
    throw new Error('Payment will open after admin approves this service')
  }

  const serviceDocuments = await Document.find({
    user: req.user._id,
    serviceType: service.type,
  }).select('status')

  if (!serviceDocuments.length) {
    res.status(400)
    throw new Error('Please upload documents for this service before making payment')
  }

  if (serviceDocuments.some((document) => document.status === 'rejected')) {
    res.status(400)
    throw new Error('Some documents were rejected. Please re-upload and wait for admin review')
  }

  if (serviceDocuments.some((document) => document.status !== 'approved')) {
    res.status(400)
    throw new Error('Payment will open after admin finishes reviewing your documents')
  }

  const existingPayment = await Payment.findOne({
    user: req.user._id,
    $and: [
      {
        $or: [
          { service: service._id },
          { service: null, serviceType: service.type },
        ],
      },
      {
        $or: [
          { verificationStatus: 'pending' },
          { verificationStatus: 'verified' },
          { status: 'paid' },
        ],
      },
    ],
  }).sort({ createdAt: -1 })

  if (existingPayment) {
    res.status(400)
    throw new Error('A payment request already exists for this service')
  }

  const payment = await Payment.create({
    user: req.user._id,
    service: service._id,
    invoiceNumber: buildInvoiceNumber(),
    serviceType: service.type,
    description,
    amount: Number(service.price || 0),
    paymentMethod,
    transactionId,
    screenshotUrl: buildUploadUrl(req, req.file),
    screenshotName: req.file?.originalname || '',
  })

  let checkout = { enabled: false }
  const razorpay = getRazorpayClient()

  if (paymentMethod === 'online' && razorpay) {
    const order = await razorpay.orders.create({
      amount: Math.round(Number(payment.amount) * 100),
      currency: 'INR',
      receipt: payment.invoiceNumber,
    })

    payment.razorpayOrderId = order.id
    await payment.save()

    checkout = {
      enabled: true,
      key: process.env.RAZORPAY_KEY_ID,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      description: description || `${service.type} invoice`,
      prefill: {
        name: req.user.name,
        email: req.user.email,
        contact: req.user.phone,
      },
    }
  }

  await createNotification({
    userId: req.user._id,
    title: 'Invoice generated',
    message:
      paymentMethod === 'manual'
        ? `${payment.invoiceNumber} has been submitted for manual payment verification.`
        : `${payment.invoiceNumber} has been created for ${service.type}.`,
  })

  res.status(201).json({
    message: 'Payment request created successfully',
    payment,
    checkout,
  })
})

export const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, paymentRecordId } = req.body

  if (!process.env.RAZORPAY_KEY_SECRET) {
    res.status(400)
    throw new Error('Razorpay is not configured')
  }

  const payment = await Payment.findById(paymentRecordId)

  if (!payment) {
    res.status(404)
    throw new Error('Payment record not found')
  }

  if (payment.user.toString() !== req.user._id.toString()) {
    res.status(403)
    throw new Error('You do not have access to this payment')
  }

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex')

  if (expectedSignature !== razorpay_signature) {
    res.status(400)
    throw new Error('Invalid payment signature')
  }

  payment.status = 'paid'
  payment.verificationStatus = 'verified'
  payment.transactionId = razorpay_payment_id
  payment.razorpayOrderId = razorpay_order_id
  payment.razorpayPaymentId = razorpay_payment_id
  payment.paidAt = new Date()
  payment.verifiedAt = new Date()
  await payment.save()
  const movedServiceToInProgress = await markServiceInProgressAfterPayment(payment.service)

  await createNotification({
    userId: req.user._id,
    title: 'Payment received',
    message: movedServiceToInProgress
      ? `${payment.invoiceNumber} has been marked as paid. ${payment.serviceType} is now in progress.`
      : `${payment.invoiceNumber} has been marked as paid.`,
  })

  res.json({
    message: 'Payment verified successfully',
    payment,
  })
})

export const getUserPayments = asyncHandler(async (req, res) => {
  const payments = await Payment.find({ user: req.user._id }).populate('service', 'type price status').sort({ createdAt: -1 })
  res.json({ payments })
})
