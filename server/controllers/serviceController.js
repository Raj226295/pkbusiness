import asyncHandler from '../middleware/asyncHandler.js'
import Service from '../models/Service.js'

export const getUserServices = asyncHandler(async (req, res) => {
  const services = await Service.find({ user: req.user._id }).sort({ updatedAt: -1 })
  res.json({ services })
})
