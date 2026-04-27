import jwt from 'jsonwebtoken'
import asyncHandler from './asyncHandler.js'
import User from '../models/User.js'

export const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401)
    throw new Error('Not authorized, token missing')
  }

  const token = authHeader.split(' ')[1]
  const decoded = jwt.verify(token, process.env.JWT_SECRET)
  req.user = await User.findById(decoded.id).select('-password')

  if (!req.user) {
    res.status(401)
    throw new Error('User not found')
  }

  next()
})

export const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    res.status(403)
    throw new Error('Admin access required')
  }

  next()
}
