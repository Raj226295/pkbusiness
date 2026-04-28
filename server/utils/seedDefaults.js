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

  const normalizedAdminEmail = process.env.ADMIN_EMAIL.toLowerCase()
  let adminUser = await User.findOne({ email: normalizedAdminEmail })

  if (!adminUser) {
    adminUser = await User.findOne({ role: 'admin' }).sort({ createdAt: 1 })
  }

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
    return
  }

  let hasChanges = false

  if (adminUser.name !== (process.env.ADMIN_NAME || 'CA Admin')) {
    adminUser.name = process.env.ADMIN_NAME || 'CA Admin'
    hasChanges = true
  }

  if (adminUser.email !== normalizedAdminEmail) {
    adminUser.email = normalizedAdminEmail
    hasChanges = true
  }

  if (adminUser.phone !== (process.env.ADMIN_PHONE || '9999999999')) {
    adminUser.phone = process.env.ADMIN_PHONE || '9999999999'
    hasChanges = true
  }

  if (adminUser.role !== 'admin') {
    adminUser.role = 'admin'
    hasChanges = true
  }

  if (adminUser.isBlocked) {
    adminUser.isBlocked = false
    adminUser.blockedAt = null
    hasChanges = true
  }

  if (!(await adminUser.matchPassword(process.env.ADMIN_PASSWORD))) {
    adminUser.password = process.env.ADMIN_PASSWORD
    hasChanges = true
  }

  if (hasChanges) {
    await adminUser.save()
    console.log('Default admin synchronized')
  }
}
