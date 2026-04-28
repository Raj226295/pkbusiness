import Notification from '../models/Notification.js'

export async function createNotification({ userId, title, message, category = 'general', link = '', fileUrl = '', actionLabel = '' }) {
  if (!userId) {
    return null
  }

  return Notification.create({
    user: userId,
    title,
    message,
    category,
    link,
    fileUrl,
    actionLabel,
  })
}
