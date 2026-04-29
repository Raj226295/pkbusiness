import express from 'express'
import { downloadAdminDocument, uploadDocument } from '../controllers/documentController.js'
import {
  assignService,
  createAdminAppointment,
  createServiceCatalogItem,
  createUser,
  deleteServiceCatalogItem,
  deleteUser,
  getAdminMessages,
  getAdminOverview,
  getAllAppointments,
  getAllDocuments,
  getAllPayments,
  getAllServices,
  getAllUsers,
  getServiceCatalog,
  getUserDetails,
  reviewDocument,
  sendUserMessage,
  updateAppointment,
  updatePayment,
  updateServiceCatalogItem,
  updateService,
  updateUserBlockStatus,
} from '../controllers/adminController.js'
import { adminOnly, protect } from '../middleware/authMiddleware.js'
import { upload } from '../middleware/uploadMiddleware.js'

const router = express.Router()

router.use(protect, adminOnly)

router.get('/overview', getAdminOverview)
router.get('/messages', getAdminMessages)
router.get('/users', getAllUsers)
router.post('/users', createUser)
router.get('/users/:id', getUserDetails)
router.patch('/users/:id/block', updateUserBlockStatus)
router.post('/users/:id/message', sendUserMessage)
router.delete('/users/:id', deleteUser)
router.get('/documents', getAllDocuments)
router.post('/documents/upload', upload.single('file'), uploadDocument)
router.get('/documents/:id/download', downloadAdminDocument)
router.patch('/documents/:id', reviewDocument)
router.get('/service-catalog', getServiceCatalog)
router.post('/service-catalog', createServiceCatalogItem)
router.patch('/service-catalog/:id', updateServiceCatalogItem)
router.delete('/service-catalog/:id', deleteServiceCatalogItem)
router.get('/services', getAllServices)
router.post('/services', assignService)
router.patch('/services/:id', updateService)
router.get('/appointments', getAllAppointments)
router.post('/appointments', createAdminAppointment)
router.patch('/appointments/:id', updateAppointment)
router.get('/payments', getAllPayments)
router.patch('/payments/:id', updatePayment)

export default router
