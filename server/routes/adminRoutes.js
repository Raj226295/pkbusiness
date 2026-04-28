import express from 'express'
import { uploadDocument } from '../controllers/documentController.js'
import {
  assignService,
  deleteUser,
  getAdminOverview,
  getAllAppointments,
  getAllDocuments,
  getAllPayments,
  getAllServices,
  getAllUsers,
  reviewDocument,
  updateAppointment,
  updatePayment,
  updateService,
} from '../controllers/adminController.js'
import { adminOnly, protect } from '../middleware/authMiddleware.js'
import { upload } from '../middleware/uploadMiddleware.js'

const router = express.Router()

router.use(protect, adminOnly)

router.get('/overview', getAdminOverview)
router.get('/users', getAllUsers)
router.delete('/users/:id', deleteUser)
router.get('/documents', getAllDocuments)
router.post('/documents/upload', upload.single('file'), uploadDocument)
router.patch('/documents/:id', reviewDocument)
router.get('/services', getAllServices)
router.post('/services', assignService)
router.patch('/services/:id', updateService)
router.get('/appointments', getAllAppointments)
router.patch('/appointments/:id', updateAppointment)
router.get('/payments', getAllPayments)
router.patch('/payments/:id', updatePayment)

export default router
