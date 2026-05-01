import asyncHandler from '../middleware/asyncHandler.js'
import Service from '../models/Service.js'
import ServiceCatalog from '../models/ServiceCatalog.js'
import { createNotification } from '../utils/createNotification.js'

async function loadActiveServiceCatalog() {
  return ServiceCatalog.find({ isActive: true }).sort({ name: 1 })
}

export const getUserServices = asyncHandler(async (req, res) => {
  const services = await Service.find({ user: req.user._id }).populate('catalogService').sort({ updatedAt: -1 })
  res.json({ services })
})

export const getServiceCatalogForUsers = asyncHandler(async (_req, res) => {
  const services = await loadActiveServiceCatalog()
  res.json({ services })
})

export const getPublicServiceCatalog = asyncHandler(async (_req, res) => {
  const services = await loadActiveServiceCatalog()
  res.json({ services })
})

export const requestService = asyncHandler(async (req, res) => {
  const { catalogServiceId, notes = '' } = req.body

  if (!catalogServiceId) {
    res.status(400)
    throw new Error('Please select a service')
  }

  const catalogService = await ServiceCatalog.findById(catalogServiceId)

  if (!catalogService || !catalogService.isActive) {
    res.status(404)
    throw new Error('Selected service is not available')
  }

  const existingActiveRequest = await Service.findOne({
    user: req.user._id,
    catalogService: catalogService._id,
    status: { $in: ['pending', 'approved', 'in progress'] },
  })

  if (existingActiveRequest) {
    res.status(400)
    throw new Error('This service is already active in your dashboard')
  }

  const service = await Service.create({
    user: req.user._id,
    requestedByClient: true,
    catalogService: catalogService._id,
    type: catalogService.name,
    description: catalogService.description,
    price: 0,
    status: 'pending',
    priority: 'medium',
    notes: typeof notes === 'string' ? notes.trim() : '',
  })

  await createNotification({
    userId: req.user._id,
    title: 'Service request submitted',
    message: `${catalogService.name} has been added to your dashboard for admin review. Price will be shared after document verification.`,
    category: 'service',
    link: '/dashboard/services',
    actionLabel: 'View service',
  })

  await service.populate('catalogService')

  res.status(201).json({
    message: 'Service selected successfully',
    service,
  })
})
