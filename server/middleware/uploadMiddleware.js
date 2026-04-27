import fs from 'node:fs'
import path from 'node:path'
import multer from 'multer'

const uploadDir = path.resolve('server', 'uploads')

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadDir)
  },
  filename: (_req, file, callback) => {
    // Prefix uploads to avoid collisions when clients submit similarly named files.
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    callback(null, `${uniqueSuffix}-${file.originalname.replace(/\s+/g, '-')}`)
  },
})

const fileFilter = (_req, file, callback) => {
  const isAllowed = file.mimetype === 'application/pdf' || file.mimetype.startsWith('image/')

  if (!isAllowed) {
    callback(new Error('Only PDF and image files are allowed'))
    return
  }

  callback(null, true)
}

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
})
