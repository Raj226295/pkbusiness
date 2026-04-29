import Blog from '../models/Blog.js'
import ServiceCatalog from '../models/ServiceCatalog.js'
import User from '../models/User.js'
import { defaultBlogs } from '../constants/defaultBlogs.js'
import { defaultServiceCatalog } from '../constants/defaultServiceCatalog.js'

export async function seedDefaults() {
  const existingBlogCount = await Blog.countDocuments()

  if (!existingBlogCount) {
    // Seed starter content so the public blog is usable on first boot.
    await Blog.insertMany(defaultBlogs)
    console.log('Default blogs seeded')
  }

  const existingServiceCatalogCount = await ServiceCatalog.countDocuments()

  if (!existingServiceCatalogCount) {
    await ServiceCatalog.insertMany(defaultServiceCatalog)
    console.log('Default service catalog seeded')
  }

  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    return
  }

  const normalizedAdminEmail = process.env.ADMIN_EMAIL.toLowerCase()
  const adminUser =
    (await User.findOne({ email: normalizedAdminEmail })) ||
    (await User.findOne({ role: 'admin' }).sort({ createdAt: 1 }))

  if (!adminUser) {
    await User.create({
      name: process.env.ADMIN_NAME || 'CA Admin',
      email: normalizedAdminEmail,
      phone: process.env.ADMIN_PHONE || '9999999999',
      password: process.env.ADMIN_PASSWORD,
      role: 'admin',
      isBlocked: false,
    })
    console.log('Default admin seeded')
  }
}
