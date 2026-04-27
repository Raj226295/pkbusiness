import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { publicNavLinks } from '../../data/siteData.js'

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    setIsMenuOpen(false)
  }, [location.pathname])

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <header className="navbar-wrap">
      <nav className="navbar">
        <Link className="brand" to="/">
          <span className="brand-mark">SV</span>
          <span>
            <strong>Singh Verma & Associates</strong>
            <small>Chartered Accountants</small>
          </span>
        </Link>

        <button
          aria-expanded={isMenuOpen}
          aria-label="Toggle navigation"
          className="menu-toggle"
          onClick={() => setIsMenuOpen((open) => !open)}
          type="button"
        >
          {isMenuOpen ? 'Close' : 'Menu'}
        </button>

        <div className={`nav-links ${isMenuOpen ? 'is-open' : ''}`}>
          <div className="nav-group">
            {publicNavLinks.map((link) => (
              <NavLink
                key={link.to}
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                to={link.to}
              >
                {link.label}
              </NavLink>
            ))}
          </div>

          <div className="nav-actions">
            {user ? (
              <>
                <Link className="button button-ghost" to={user.role === 'admin' ? '/admin' : '/dashboard'}>
                  {user.role === 'admin' ? 'Admin Panel' : 'Dashboard'}
                </Link>
                <button className="button button-primary" onClick={handleLogout} type="button">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link className="button button-ghost" to="/login">
                  Login
                </Link>
                <Link className="button button-primary" to="/contact">
                  Book Consultation
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>
    </header>
  )
}

export default Navbar
