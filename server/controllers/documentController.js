import asyncHandler from '../middleware/asyncHandler.js'
import Document from '../models/Document.js'
import { createNotification } from '../utils/createNotification.js'
import { sendEmail } from '../utils/sendEmail.js'

export const uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400)
    throw new Error('Please upload a PDF or image file')
  }

  const { title, serviceType } = req.body

  if (!title || !serviceType) {
    res.status(400)
    throw new Error('Title and service type are required')
  }

  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`
  const document = await Document.create({
    user: req.user._id,
    title,
    serviceType,
    filename: req.file.filename,
    fileUrl,
    mimeType: req.file.mimetype,
  })

  await createNotification({
    userId: req.user._id,
    title: 'Document uploaded',
    message: `${title} has been uploaded and is awaiting review.`,
  })

  await sendEmail({
    to: process.env.SMTP_FROM || process.env.SMTP_USER,
    subject: 'New document uploaded',
    text: `${req.user.name} uploaded ${title} for ${serviceType}.`,
  })

  res.status(201).json({
    message: 'Document uploaded successfully',
    document,
  })
})

export const getUserDocuments = asyncHandler(async (req, res) => {
  const documents = await Document.find({ user: req.user._id }).sort({ createdAt: -1 })
  res.json({ documents })
})
