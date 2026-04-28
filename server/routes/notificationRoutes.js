import express from 'express'
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../controllers/notificationController.js'
import { protect } from '../middleware/authMiddleware.js'

const router = express.Router()

router.get('/', protect, getNotifications)
router.patch('/:id/read', protect, markNotificationAsRead)
router.patch('/read-all', protect, markAllNotificationsAsRead)

export default router
