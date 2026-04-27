import express from 'express'
import { getUserDocuments, uploadDocument } from '../controllers/documentController.js'
import { protect } from '../middleware/authMiddleware.js'
import { upload } from '../middleware/uploadMiddleware.js'

const router = express.Router()

router.post('/upload', protect, upload.single('file'), uploadDocument)
router.get('/', protect, getUserDocuments)

export default router
