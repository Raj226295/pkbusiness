import asyncHandler from '../middleware/asyncHandler.js'
import Blog from '../models/Blog.js'

export const getBlogs = asyncHandler(async (_req, res) => {
  const blogs = await Blog.find().sort({ publishedAt: -1 })
  res.json({ blogs })
})

export const getBlogBySlug = asyncHandler(async (req, res) => {
  const blog = await Blog.findOne({ slug: req.params.slug })

  if (!blog) {
    res.status(404)
    throw new Error('Blog post not found')
  }

  res.json({ blog })
})
