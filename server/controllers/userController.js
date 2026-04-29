import fs from 'node:fs'
import path from 'node:path'
import asyncHandler from '../middleware/asyncHandler.js'
import User from '../models/User.js'

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

function clampNumber(value, min, max, fallback) {
  const parsedValue = Number.parseFloat(value)

  if (Number.isNaN(parsedValue)) {
    return fallback
  }

  return Math.min(Math.max(parsedValue, min), max)
}

function removeStoredFile(fileUrl) {
  if (!fileUrl) {
    return
  }

  const fileName = path.basename(fileUrl)
  const absolutePath = path.resolve('server', 'uploads', fileName)

  if (fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath)
  }
}

export const getProfile = asyncHandler(async (req, res) => {
  res.json({ user: serializeUser(req.user) })
})

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)

  if (!user) {
    res.status(404)
    throw new Error('User not found')
  }

  if (req.body.email && req.body.email !== user.email) {
    const emailTaken = await User.findOne({
      email: req.body.email.toLowerCase(),
      _id: { $ne: user._id },
    })

    if (emailTaken) {
      res.status(400)
      throw new Error('Email is already in use')
    }
  }

  user.name = req.body.name || user.name
  user.email = req.body.email?.toLowerCase() || user.email
  user.phone = req.body.phone || user.phone
  user.companyName = req.body.companyName || ''

  const updatedUser = await user.save()

  res.json({
    message: 'Profile updated successfully',
    user: serializeUser(updatedUser),
  })
})

export const updateProfileImage = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id)

  if (!user) {
    res.status(404)
    throw new Error('User not found')
  }

  if (!req.file && !user.profileImage) {
    res.status(400)
    throw new Error('Please upload a profile image')
  }

  const previousProfileImage = user.profileImage
  const nextProfileImage = req.file ? `/uploads/${req.file.filename}` : user.profileImage
  user.profileImage = nextProfileImage
  user.profileImageZoom = clampNumber(req.body.zoom, 1, 2.5, user.profileImageZoom || 1)
  user.profileImageOffsetX = clampNumber(req.body.offsetX, -35, 35, user.profileImageOffsetX || 0)
  user.profileImageOffsetY = clampNumber(req.body.offsetY, -35, 35, user.profileImageOffsetY || 0)
  const updatedUser = await user.save()

  if (req.file && previousProfileImage && previousProfileImage !== updatedUser.profileImage) {
    removeStoredFile(previousProfileImage)
  }

  res.json({
    message: 'Profile image updated successfully',
    user: serializeUser(updatedUser),
  })
})

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body
  const user = await User.findById(req.user._id)

  if (!currentPassword || !newPassword) {
    res.status(400)
    throw new Error('Current password and new password are required')
  }

  if (!(await user.matchPassword(currentPassword))) {
    res.status(400)
    throw new Error('Current password is incorrect')
  }

  user.password = newPassword
  await user.save()

  res.json({ message: 'Password updated successfully' })
})
