import asyncHandler from '../middleware/asyncHandler.js'
import Document from '../models/Document.js'
import User from '../models/User.js'
import { createNotification } from '../utils/createNotification.js'
import { sendEmail } from '../utils/sendEmail.js'

async function resolveDocumentOwner(req, res) {
  if (req.user.role !== 'admin' || !req.body.userId) {
    return req.user
  }

  const targetUser = await User.findById(req.body.userId).select('name email role')

  if (!targetUser) {
    res.status(404)
    throw new Error('Selected user not found')
  }

  return targetUser
}

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

  const owner = await resolveDocumentOwner(req, res)
  const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`
  const document = await Document.create({
    user: owner._id,
    uploadedBy: req.user._id,
    title,
    serviceType,
    filename: req.file.filename,
    fileUrl,
    mimeType: req.file.mimetype,
  })

  if (req.user.role === 'admin' && owner._id.toString() !== req.user._id.toString()) {
    await createNotification({
      userId: owner._id,
      title: 'New document shared',
      message: `${req.user.name} shared ${title} with your account.`,
      category: 'document',
      link: '/dashboard/documents',
      fileUrl,
      actionLabel: 'Open document',
    })
  } else {
    await createNotification({
      userId: owner._id,
      title: 'Document uploaded',
      message: `${title} has been uploaded and is awaiting review.`,
      category: 'document',
      link: '/dashboard/documents',
      fileUrl,
      actionLabel: 'Open document',
    })
  }

  await sendEmail({
    to:
      req.user.role === 'admin' && owner.email && owner._id.toString() !== req.user._id.toString()
        ? owner.email
        : process.env.SMTP_FROM || process.env.SMTP_USER,
    subject:
      req.user.role === 'admin' && owner._id.toString() !== req.user._id.toString()
        ? 'New document shared with you'
        : 'New document uploaded',
    text:
      req.user.role === 'admin' && owner._id.toString() !== req.user._id.toString()
        ? `${req.user.name} shared ${title} for ${serviceType}. Please log in to view it.`
        : `${req.user.name} uploaded ${title} for ${serviceType}.`,
  })

  res.status(201).json({
    message:
      req.user.role === 'admin' && owner._id.toString() !== req.user._id.toString()
        ? 'Document shared successfully'
        : 'Document uploaded successfully',
    document,
  })
})

export const getUserDocuments = asyncHandler(async (req, res) => {
  const documents = await Document.find({ user: req.user._id })
    .populate('uploadedBy', 'name email role')
    .sort({ createdAt: -1 })
  res.json({ documents })
})
