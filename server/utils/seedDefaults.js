import Blog from '../models/Blog.js'
import User from '../models/User.js'
import { defaultBlogs } from '../constants/defaultBlogs.js'

export async function seedDefaults() {
  const existingBlogCount = await Blog.countDocuments()

  if (!existingBlogCount) {
    // Seed starter content so the public blog is usable on first boot.
    await Blog.insertMany(defaultBlogs)
    console.log('Default blogs seeded')
  }

  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    return
  }

  const adminExists = await User.findOne({ email: process.env.ADMIN_EMAIL.toLowerCase() })

  if (!adminExists) {
    // Seed an admin only when explicit credentials are supplied in the environment.
    await User.create({
      name: process.env.ADMIN_NAME || 'CA Admin',
      email: process.env.ADMIN_EMAIL,
      phone: process.env.ADMIN_PHONE || '9999999999',
      password: process.env.ADMIN_PASSWORD,
      role: 'admin',
    })
    console.log('Default admin seeded')
  }
}
