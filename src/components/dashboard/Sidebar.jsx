import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { adminLinks, dashboardLinks, siteBrand } from '../../data/siteData.js'
import AdminIcon from '../admin/AdminIcon.jsx'

function Sidebar({ role = 'user' }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const links = role === 'admin' ? adminLinks : dashboardLinks

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <aside className={`sidebar ${role === 'admin' ? 'admin-sidebar' : ''}`}>
      <div className="sidebar-brand">
        <span className="brand-mark">{siteBrand.shortName}</span>
        <div>
          <strong>{siteBrand.name}</strong>
          <small>{role === 'admin' ? 'Client Portal Admin' : 'Client Portal'}</small>
          {role === 'admin' ? <span className="role-chip admin sidebar-role-chip">ADMIN</span> : user?.name ? <small>{user.name}</small> : null}
        </div>
      </div>

      <nav className="sidebar-nav">
        {links.map((link) => (
          <NavLink
            key={link.to}
            end={link.end}
            className={({ isActive }) => (isActive ? 'sidebar-link active' : 'sidebar-link')}
            to={link.to}
          >
            {link.icon ? (
              <span className="sidebar-link-icon">
                <AdminIcon name={link.icon} size={16} />
              </span>
            ) : null}
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>

      <button
        className="button button-primary button-compact sidebar-logout"
        onClick={handleLogout}
        type="button"
      >
        {role === 'admin' ? (
          <span className="sidebar-link-icon">
            <AdminIcon name="logout" size={16} />
          </span>
        ) : null}
        Logout
      </button>
    </aside>
  )
}

export default Sidebar
