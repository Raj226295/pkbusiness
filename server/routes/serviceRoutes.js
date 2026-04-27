import express from 'express'
import { getUserServices } from '../controllers/serviceController.js'
import { protect } from '../middleware/authMiddleware.js'

const router = express.Router()

router.get('/', protect, getUserServices)

export default router
