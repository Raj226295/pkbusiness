import nodemailer from 'nodemailer'

let transporter

function getTransporter() {
  if (transporter) {
    return transporter
  }

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    return null
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

  return transporter
}

export async function sendEmail({ to, subject, text, html }) {
  const mailer = getTransporter()

  if (!mailer) {
    console.log(`Email skipped. Subject: ${subject}`)
    return
  }

  try {
    await mailer.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      text,
      html,
    })
  } catch (error) {
    console.error(`Email send failed: ${error.message}`)
  }
}
