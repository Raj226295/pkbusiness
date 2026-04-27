import asyncHandler from '../middleware/asyncHandler.js'
import User from '../models/User.js'

function serializeUser(user) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    companyName: user.companyName,
    role: user.role,
  }
}

export const getProfile = asyncHandler(async (req, res) => {
  res.json({ user: req.user })
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
