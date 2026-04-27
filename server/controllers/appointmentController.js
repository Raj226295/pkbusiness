import asyncHandler from '../middleware/asyncHandler.js'
import Appointment from '../models/Appointment.js'
import { createNotification } from '../utils/createNotification.js'
import { sendEmail } from '../utils/sendEmail.js'

export const createAppointment = asyncHandler(async (req, res) => {
  const { scheduledFor, notes } = req.body

  if (!scheduledFor) {
    res.status(400)
    throw new Error('Appointment date and time are required')
  }

  const appointment = await Appointment.create({
    user: req.user._id,
    scheduledFor,
    notes,
  })

  await createNotification({
    userId: req.user._id,
    title: 'Appointment booked',
    message: 'Your consultation request has been booked successfully.',
  })

  await sendEmail({
    to: process.env.SMTP_FROM || process.env.SMTP_USER,
    subject: 'New consultation booking',
    text: `${req.user.name} booked a consultation for ${scheduledFor}.`,
  })

  res.status(201).json({
    message: 'Appointment booked successfully',
    appointment,
  })
})

export const getUserAppointments = asyncHandler(async (req, res) => {
  const appointments = await Appointment.find({ user: req.user._id }).sort({ scheduledFor: -1 })
  res.json({ appointments })
})
