import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import UserAvatar from '../common/UserAvatar.jsx'

const titleMap = {
  '/dashboard': 'Overview',
  '/dashboard/documents': 'Documents',
  '/dashboard/appointments': 'Appointments',
  '/dashboard/services': 'Service Tracker',
  '/dashboard/payments': 'Payments',
  '/dashboard/notifications': 'Notifications',
  '/dashboard/profile': 'Profile',
  '/admin': 'Admin Overview',
  '/admin/users': 'Users',
  '/admin/documents': 'Document Review',
  '/admin/services': 'Service Assignment',
  '/admin/appointments': 'Appointment Desk',
  '/admin/payments': 'Transactions',
  '/admin/profile': 'Profile',
}

function DashboardLayout({ role }) {
  const { user } = useAuth()
  const location = useLocation()

  return (
    <div className="dashboard-shell">
      <Sidebar role={role} />
      <div className="dashboard-content">
        <header className="dashboard-topbar">
          <div>
            <span className="eyebrow">{role === 'admin' ? 'Internal Operations' : 'Client Workspace'}</span>
            <h2>{titleMap[location.pathname] || 'Workspace'}</h2>
          </div>
          <div className="user-pill">
            <UserAvatar alt={`${user?.name || 'User'} profile image`} className="user-pill-avatar" user={user} />
            <div className="user-pill-copy">
              <strong>{user?.name}</strong>
              <span>{user?.role === 'admin' ? 'Administrator' : 'Client'}</span>
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
