import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { adminLinks, dashboardLinks } from '../../data/siteData.js'

function Sidebar({ role = 'user' }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const links = role === 'admin' ? adminLinks : dashboardLinks

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-mark">SV</span>
        <div>
          <strong>{role === 'admin' ? 'Admin Workspace' : 'Client Portal'}</strong>
          <small>{user?.name}</small>
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
            {link.label}
          </NavLink>
        ))}
      </nav>

      <button className="button button-primary sidebar-logout" onClick={handleLogout} type="button">
        Logout
      </button>
    </aside>
  )
}

export default Sidebar
