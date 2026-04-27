import crypto from 'node:crypto'
import Razorpay from 'razorpay'
import asyncHandler from '../middleware/asyncHandler.js'
import Payment from '../models/Payment.js'
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

export const createPayment = asyncHandler(async (req, res) => {
  const { serviceType, amount, description } = req.body

  if (!serviceType || !amount) {
    res.status(400)
    throw new Error('Service type and amount are required')
  }

  const payment = await Payment.create({
    user: req.user._id,
    invoiceNumber: buildInvoiceNumber(),
    serviceType,
    description,
    amount,
  })

  let checkout = { enabled: false }
  const razorpay = getRazorpayClient()

  if (razorpay) {
    const order = await razorpay.orders.create({
      amount: Math.round(Number(amount) * 100),
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
      description: description || `${serviceType} invoice`,
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
    message: `${payment.invoiceNumber} has been created for ${serviceType}.`,
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

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex')

  if (expectedSignature !== razorpay_signature) {
    res.status(400)
    throw new Error('Invalid payment signature')
  }

  payment.status = 'paid'
  payment.transactionId = razorpay_payment_id
  payment.razorpayOrderId = razorpay_order_id
  payment.razorpayPaymentId = razorpay_payment_id
  payment.paidAt = new Date()
  await payment.save()

  await createNotification({
    userId: req.user._id,
    title: 'Payment received',
    message: `${payment.invoiceNumber} has been marked as paid.`,
  })

  res.json({
    message: 'Payment verified successfully',
    payment,
  })
})

export const getUserPayments = asyncHandler(async (req, res) => {
  const payments = await Payment.find({ user: req.user._id }).sort({ createdAt: -1 })
  res.json({ payments })
})
