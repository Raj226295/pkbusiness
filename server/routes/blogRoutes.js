import express from 'express'
import { getBlogBySlug, getBlogs } from '../controllers/blogController.js'

const router = express.Router()

router.get('/', getBlogs)
router.get('/:slug', getBlogBySlug)

export default router
