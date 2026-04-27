import express from 'express'
import { createAppointment, getUserAppointments } from '../controllers/appointmentController.js'
import { protect } from '../middleware/authMiddleware.js'

const router = express.Router()

router.post('/', protect, createAppointment)
router.get('/', protect, getUserAppointments)

export default router
