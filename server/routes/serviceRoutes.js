import express from 'express'
import { getServiceCatalogForUsers, getUserServices, requestService } from '../controllers/serviceController.js'
import { protect } from '../middleware/authMiddleware.js'

const router = express.Router()

router.get('/catalog', protect, getServiceCatalogForUsers)
router.get('/', protect, getUserServices)
router.post('/request', protect, requestService)

export default router
