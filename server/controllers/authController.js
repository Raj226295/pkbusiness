import asyncHandler from '../middleware/asyncHandler.js'
import User from '../models/User.js'
import { ensureClientDocumentFolder } from '../utils/documentStorage.js'
import { generateToken } from '../utils/generateToken.js'
import { sendEmail } from '../utils/sendEmail.js'

function serializeUser(user) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    companyName: user.companyName,
    profileImage: user.profileImage,
    profileImageZoom: user.profileImageZoom,
    profileImageOffsetX: user.profileImageOffsetX,
    profileImageOffsetY: user.profileImageOffsetY,
    isBlocked: user.isBlocked,
    role: user.role,
  }
}

export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body

  if (!name || !email || !phone || !password) {
    res.status(400)
    throw new Error('Please provide name, email, phone, and password')
  }

  const existingUser = await User.findOne({ email: email.toLowerCase() })

  if (existingUser) {
    res.status(400)
    throw new Error('User already exists with this email')
  }

  const user = await User.create({
    name,
    email,
    phone,
    password,
  })

  await ensureClientDocumentFolder(user)

  await sendEmail({
    to: user.email,
    subject: 'Welcome to Singh Verma & Associates',
    text: `Hello ${user.name}, your client portal account has been created successfully.`,
  })

  res.status(201).json({
    token: generateToken(user._id),
    user: serializeUser(user),
  })
})

export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body
  const user = await User.findOne({ email: email?.toLowerCase() })

  if (user?.isBlocked) {
    res.status(403)
    throw new Error('This account has been blocked. Please contact the admin.')
  }

  if (!user || !(await user.matchPassword(password))) {
    res.status(401)
    throw new Error('Invalid email or password')
  }

  res.json({
    token: generateToken(user._id),
    user: serializeUser(user),
  })
})
