import express from 'express'
import { getNotifications, markAllNotificationsAsRead } from '../controllers/notificationController.js'
import { protect } from '../middleware/authMiddleware.js'

const router = express.Router()

router.get('/', protect, getNotifications)
router.patch('/read-all', protect, markAllNotificationsAsRead)

export default router
