import fs from 'node:fs/promises'
import path from 'node:path'

export const uploadsRoot = path.resolve('server', 'uploads')
const documentsRoot = path.join(uploadsRoot, 'documents')

export function sanitizeStorageSegment(value = 'client') {
  return (
    String(value)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'client'
  )
}

export function buildClientFolderName(user = {}) {
  const label = sanitizeStorageSegment(user.name || user.email || 'client')
  const suffix = String(user._id || '').slice(-6) || 'folder'
  return `${label}-${suffix}`
}

export async function moveUploadToClientFolder(file, user) {
  await fs.mkdir(documentsRoot, { recursive: true })

  const folderName = buildClientFolderName(user)
  const folderPath = path.join(documentsRoot, folderName)
  await fs.mkdir(folderPath, { recursive: true })

  const finalPath = path.join(folderPath, file.filename)
  await fs.rename(file.path, finalPath)

  return {
    filename: file.filename,
    folderName,
    relativePath: path.relative(uploadsRoot, finalPath).replace(/\\/g, '/'),
  }
}

export function buildDocumentPublicUrl(req, relativePath = '') {
  return `${req.protocol}://${req.get('host')}/uploads/${relativePath.replace(/\\/g, '/')}`
}

export function resolveStoredDocumentPath(document) {
  if (document?.relativePath) {
    return path.join(uploadsRoot, document.relativePath)
  }

  if (document?.fileUrl) {
    return path.join(uploadsRoot, path.basename(document.fileUrl))
  }

  return ''
}

export function serializeDocument(document, role = 'user') {
  const record = typeof document.toObject === 'function' ? document.toObject() : { ...document }
  const normalizedStatus = record.status === 'verified' ? 'approved' : record.status

  return {
    ...record,
    status: normalizedStatus,
    originalName: record.originalName || record.filename,
    storageFolder: record.storageFolder || buildClientFolderName(record.user || {}),
    downloadUrl:
      role === 'admin' ? `/api/admin/documents/${record._id}/download` : `/api/documents/${record._id}/download`,
  }
}
