import asyncHandler from '../middleware/asyncHandler.js'
import Appointment from '../models/Appointment.js'
import { createNotification } from '../utils/createNotification.js'
import { sendEmail } from '../utils/sendEmail.js'

function safeTrim(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback
}

function normalizeAppointmentStatus(value = 'pending') {
  const normalized = safeTrim(value, 'pending').toLowerCase()

  if (normalized === 'confirmed') return 'approved'
  if (normalized === 'scheduled') return 'rescheduled'
  if (['pending', 'approved', 'rejected', 'rescheduled', 'completed', 'cancelled'].includes(normalized)) {
    return normalized
  }

  return 'pending'
}

function toDisplayStatus(status = 'pending') {
  return normalizeAppointmentStatus(status)
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

export const createAppointment = asyncHandler(async (req, res) => {
  const scheduledFor = req.body.scheduledFor
  const notes = safeTrim(req.body.notes)
  const serviceType = safeTrim(req.body.serviceType, 'General consultation')

  if (!scheduledFor) {
    res.status(400)
    throw new Error('Appointment date and time are required')
  }

  const appointment = await Appointment.create({
    user: req.user._id,
    scheduledFor,
    serviceType,
    notes,
    status: normalizeAppointmentStatus('pending'),
  })

  await createNotification({
    userId: req.user._id,
    title: 'Appointment request submitted',
    message: `Your ${serviceType} consultation request has been submitted for admin review.`,
  })

  await sendEmail({
    to: process.env.SMTP_FROM || process.env.SMTP_USER,
    subject: 'New consultation booking',
    text: `${req.user.name} booked a ${serviceType} consultation for ${scheduledFor}.`,
  })

  res.status(201).json({
    message: 'Appointment booked successfully',
    appointment: {
      ...appointment.toObject(),
      status: normalizeAppointmentStatus(appointment.status),
    },
  })
})

export const getUserAppointments = asyncHandler(async (req, res) => {
  const appointments = await Appointment.find({ user: req.user._id }).sort({ scheduledFor: -1 })

  res.json({
    appointments: appointments.map((appointment) => ({
      ...appointment.toObject(),
      status: normalizeAppointmentStatus(appointment.status),
      statusLabel: toDisplayStatus(appointment.status),
      serviceType: appointment.serviceType || 'General consultation',
    })),
  })
})
