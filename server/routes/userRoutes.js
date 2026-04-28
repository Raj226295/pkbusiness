import express from 'express'
import {
  changePassword,
  getProfile,
  updateProfile,
  updateProfileImage,
} from '../controllers/userController.js'
import { protect } from '../middleware/authMiddleware.js'
import { upload } from '../middleware/uploadMiddleware.js'

const router = express.Router()

router.get('/profile', protect, getProfile)
router.put('/profile', protect, updateProfile)
router.put('/profile/image', protect, upload.single('profileImage'), updateProfileImage)
router.put('/password', protect, changePassword)

export default router
