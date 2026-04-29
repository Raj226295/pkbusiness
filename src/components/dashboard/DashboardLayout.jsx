import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import UserAvatar from '../common/UserAvatar.jsx'

const titleMap = {
  '/dashboard': 'Overview',
  '/dashboard/upload-documents': 'Upload Documents',
  '/dashboard/my-documents': 'My Documents',
  '/dashboard/documents': 'My Documents',
  '/dashboard/appointments': 'Appointments',
  '/dashboard/services': 'Services',
  '/dashboard/payments': 'Payments',
  '/dashboard/messages': 'Messages',
  '/dashboard/notifications': 'Notifications',
  '/dashboard/profile': 'Profile',
  '/admin': 'OVERVIEW',
  '/admin/users': 'OVERVIEW',
  '/admin/messages': 'MESSAGE',
  '/admin/documents': 'MY FOLDER',
  '/admin/folders': 'MY FOLDER',
  '/admin/services': 'SERVICES',
  '/admin/appointments': 'APPOINTMENT',
  '/admin/payments': 'PAYMENTS',
  '/admin/profile': 'PROFILE',
}

function getWorkspaceTitle(pathname) {
  if (titleMap[pathname]) {
    return titleMap[pathname]
  }

  if (pathname.startsWith('/admin/clients/')) {
    if (pathname.endsWith('/services')) return 'SERVICES'
    if (pathname.includes('/services/')) return 'SERVICES'
    if (pathname.endsWith('/appointments')) return 'APPOINTMENT'
    if (pathname.endsWith('/payments')) return 'PAYMENT'
    if (pathname.endsWith('/profile')) return 'PROFILE'
    return 'CLIENT PREVIEW'
  }

  return 'Workspace'
}

function DashboardLayout({ role }) {
  const { user } = useAuth()
  const location = useLocation()
  const isAdminPanel = role === 'admin'

  return (
    <div className={`dashboard-shell${isAdminPanel ? ' admin-shell' : ''}`}>
      <Sidebar role={role} />
      <div className="dashboard-content">
        <header className={`dashboard-topbar${isAdminPanel ? ' admin-topbar' : ''}`}>
          <div>
            <span className="eyebrow">{role === 'admin' ? 'Admin Workspace' : 'Client Workspace'}</span>
            <h2>{getWorkspaceTitle(location.pathname)}</h2>
            {isAdminPanel ? (
              <p className="admin-topbar-subtitle">Client Workspace</p>
            ) : null}
          </div>
          <div className={`user-pill${isAdminPanel ? ' admin-profile-pill' : ''}`}>
            <UserAvatar alt={`${user?.name || 'User'} profile image`} className="user-pill-avatar" user={user} />
            <div className="user-pill-copy">
              <strong>{user?.name}</strong>
              <span>{user?.email}</span>
              <div className="workspace-identity">
                <span className={`role-chip ${user?.role === 'admin' ? 'admin' : 'client'}`}>
                  {user?.role === 'admin' ? 'ADMIN' : 'Client'}
                </span>
              </div>
            </div>
          </div>
        </header>

        <main className="dashboard-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout
