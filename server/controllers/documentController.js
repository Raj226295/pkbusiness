import asyncHandler from '../middleware/asyncHandler.js'
import fs from 'node:fs'
import path from 'node:path'
import Document from '../models/Document.js'
import User from '../models/User.js'
import { createNotification } from '../utils/createNotification.js'
import { sendEmail } from '../utils/sendEmail.js'
import {
  buildDocumentPublicUrl,
  moveUploadToClientFolder,
  resolveStoredDocumentPath,
  serializeDocument,
} from '../utils/documentStorage.js'

function safeTrim(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback
}

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

async function getAccessibleDocument({ documentId, requester, adminAccess = false }, res) {
  const document = await Document.findById(documentId)
    .populate('user', 'name email role')
    .populate('uploadedBy', 'name email role')
    .populate('reviewedBy', 'name email role')

  if (!document) {
    res.status(404)
    throw new Error('Document not found')
  }

  const ownerId = document.user?._id?.toString?.() || document.user?.toString()

  if (!adminAccess && ownerId !== requester._id.toString()) {
    res.status(403)
    throw new Error('You do not have access to this document')
  }

  return document
}

export const uploadDocument = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400)
    throw new Error('Please upload a PDF or image file')
  }

  const title = safeTrim(req.body.title || req.body.documentType)
  const documentType = safeTrim(req.body.documentType, title)
  const serviceType = safeTrim(req.body.serviceType, 'General')
  const notes = safeTrim(req.body.notes)

  if (!title || !documentType) {
    res.status(400)
    throw new Error('Document type is required')
  }

  const owner = await resolveDocumentOwner(req, res)
  const storedFile = await moveUploadToClientFolder(req.file, owner)
  const fileUrl = buildDocumentPublicUrl(req, storedFile.relativePath)
  const document = await Document.create({
    user: owner._id,
    uploadedBy: req.user._id,
    title,
    documentType,
    serviceType,
    filename: storedFile.filename,
    originalName: req.file.originalname,
    relativePath: storedFile.relativePath,
    storageFolder: storedFile.folderName,
    fileUrl,
    mimeType: req.file.mimetype,
    notes,
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
    document: serializeDocument(document, req.user.role === 'admin' ? 'admin' : 'user'),
  })
})

export const getUserDocuments = asyncHandler(async (req, res) => {
  const documents = await Document.find({ user: req.user._id })
    .populate('uploadedBy', 'name email role')
    .populate('reviewedBy', 'name email role')
    .sort({ createdAt: -1 })
  res.json({ documents: documents.map((document) => serializeDocument(document, 'user')) })
})

export const downloadUserDocument = asyncHandler(async (req, res) => {
  const document = await getAccessibleDocument(
    {
      documentId: req.params.id,
      requester: req.user,
    },
    res,
  )

  const absolutePath = resolveStoredDocumentPath(document)

  if (!absolutePath || !fs.existsSync(absolutePath)) {
    res.status(404)
    throw new Error('Stored file could not be found')
  }

  res.download(absolutePath, document.originalName || path.basename(document.filename || 'document'))
})

export const downloadAdminDocument = asyncHandler(async (req, res) => {
  const document = await getAccessibleDocument(
    {
      documentId: req.params.id,
      requester: req.user,
      adminAccess: true,
    },
    res,
  )

  const absolutePath = resolveStoredDocumentPath(document)

  if (!absolutePath || !fs.existsSync(absolutePath)) {
    res.status(404)
    throw new Error('Stored file could not be found')
  }

  res.download(absolutePath, document.originalName || path.basename(document.filename || 'document'))
})
