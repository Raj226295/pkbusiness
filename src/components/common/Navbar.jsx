import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { publicNavLinks, siteBrand } from '../../data/siteData.js'

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const navRef = useRef(null)

  useEffect(() => {
    setIsMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!isMenuOpen) {
      return undefined
    }

    const handlePointerDown = (event) => {
      if (navRef.current && !navRef.current.contains(event.target)) {
        setIsMenuOpen(false)
      }
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false)
      }
    }

    const handleResize = () => {
      if (window.innerWidth > 1024) {
        setIsMenuOpen(false)
      }
    }

    const previousOverflow = document.body.style.overflow

    if (window.innerWidth <= 1024) {
      document.body.style.overflow = 'hidden'
    }

    document.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', handleResize)

    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', handleResize)
    }
  }, [isMenuOpen])

  const closeMenu = () => {
    setIsMenuOpen(false)
  }

  const handleLogout = () => {
    logout()
    closeMenu()
    navigate('/')
  }

  return (
    <header className="navbar-wrap">
      <nav className="navbar" ref={navRef}>
        <Link className="brand" onClick={closeMenu} to="/">
          <span className="brand-mark">{siteBrand.shortName}</span>
          <span>
            <strong>{siteBrand.name}</strong>
            <small>{siteBrand.tagline}</small>
          </span>
        </Link>

        <button
          aria-controls="site-navigation"
          aria-expanded={isMenuOpen}
          aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          className={`menu-toggle ${isMenuOpen ? 'is-active' : ''}`}
          onClick={() => setIsMenuOpen((open) => !open)}
          type="button"
        >
          <span aria-hidden="true" className="menu-toggle-icon">
            <span />
            <span />
            <span />
          </span>
          <span className="menu-toggle-text">{isMenuOpen ? 'Close' : 'Menu'}</span>
        </button>

        <div className={`nav-links ${isMenuOpen ? 'is-open' : ''}`} id="site-navigation">
          <div className="nav-group">
            {publicNavLinks.map((link) => (
              <NavLink
                key={link.to}
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                end={link.to === '/'}
                onClick={closeMenu}
                to={link.to}
              >
                {link.label}
              </NavLink>
            ))}
          </div>

          <div className="nav-actions">
            {user ? (
              <>
                <Link
                  className="button button-ghost"
                  onClick={closeMenu}
                  to={user.role === 'admin' ? '/admin' : '/dashboard'}
                >
                  {user.role === 'admin' ? 'Admin Panel' : 'Dashboard'}
                </Link>
                <button className="button button-primary button-compact" onClick={handleLogout} type="button">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link className="button button-login" onClick={closeMenu} to="/login">
                  Login
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>
      <button
        aria-label="Close navigation menu"
        className={`navbar-backdrop ${isMenuOpen ? 'is-visible' : ''}`}
        onClick={closeMenu}
        tabIndex={isMenuOpen ? 0 : -1}
        type="button"
      />
    </header>
  )
}

export default Navbar
