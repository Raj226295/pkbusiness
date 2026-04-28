import asyncHandler from '../middleware/asyncHandler.js'
import Notification from '../models/Notification.js'

export const getNotifications = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 })
  res.json({ notifications })
})

export const markNotificationAsRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({ _id: req.params.id, user: req.user._id })

  if (!notification) {
    res.status(404)
    throw new Error('Notification not found')
  }

  notification.read = true
  await notification.save()

  res.json({ message: 'Notification marked as read', notification })
})

export const markAllNotificationsAsRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { $set: { read: true } })
  res.json({ message: 'Notifications marked as read' })
})
