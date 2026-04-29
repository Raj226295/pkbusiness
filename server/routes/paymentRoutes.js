import express from 'express'
import { createPayment, getUserPayments, verifyPayment } from '../controllers/paymentController.js'
import { protect } from '../middleware/authMiddleware.js'
import { upload } from '../middleware/uploadMiddleware.js'

const router = express.Router()

router.get('/', protect, getUserPayments)
router.post('/', protect, upload.single('screenshot'), createPayment)
router.post('/verify', protect, verifyPayment)

export default router
