import asyncHandler from '../middleware/asyncHandler.js'
import { sendEmail } from '../utils/sendEmail.js'

export const submitContactForm = asyncHandler(async (req, res) => {
  const { name, email, phone, message } = req.body

  if (!name || !email || !phone || !message) {
    res.status(400)
    throw new Error('Please fill out all contact form fields')
  }

  const firmInbox = process.env.SMTP_FROM || process.env.SMTP_USER || 'hello@svca.in'

  await sendEmail({
    to: firmInbox,
    subject: 'New website inquiry',
    text: `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\nMessage: ${message}`,
  })

  res.status(201).json({ message: 'Contact inquiry submitted successfully' })
})
