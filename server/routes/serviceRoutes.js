import express from 'express'
import {
  getPublicServiceCatalog,
  getServiceCatalogForUsers,
  getUserServices,
  requestService,
} from '../controllers/serviceController.js'
import { protect } from '../middleware/authMiddleware.js'

const router = express.Router()

router.get('/public-catalog', getPublicServiceCatalog)
router.get('/catalog', protect, getServiceCatalogForUsers)
router.get('/', protect, getUserServices)
router.post('/request', protect, requestService)

export default router
