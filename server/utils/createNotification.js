import Notification from '../models/Notification.js'

export async function createNotification({ userId, title, message }) {
  if (!userId) {
    return null
  }

  return Notification.create({
    user: userId,
    title,
    message,
  })
}
