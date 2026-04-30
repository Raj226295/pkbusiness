import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import loginTaxFile from '../../assets/login-tax-file.jpg'
import { useAuth } from '../../context/AuthContext.jsx'
import { siteBrand } from '../../data/siteData.js'
import { extractApiError } from '../../lib/api.js'

function getDefaultPathForRole(role) {
  return role === 'admin' ? '/admin' : '/dashboard'
}

function getSafeRedirectPath(role, redirectTo = '') {
  if (!redirectTo) {
    return getDefaultPathForRole(role)
  }

  if (role === 'admin') {
    return redirectTo.startsWith('/admin') ? redirectTo : '/admin'
  }

  return redirectTo.startsWith('/dashboard') ? redirectTo : '/dashboard'
}

function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const redirectTo = location.state?.from?.pathname

  const handleChange = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const user = await login(form)
      navigate(getSafeRedirectPath(user.role, redirectTo), { replace: true })
    } catch (err) {
      setError(extractApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="auth-shell container">
      <div className="split-section auth-layout">
        <form className="panel auth-card" onSubmit={handleSubmit}>
          <div className="auth-brand">
            <Link className="brand auth-brand-lockup" to="/">
              <span className="brand-mark">{siteBrand.shortName}</span>
              <span>
                <strong>{siteBrand.name}</strong>
                <small>{siteBrand.tagline}</small>
              </span>
            </Link>
            <span className="auth-tag">Client Portal</span>
          </div>

          <div className="auth-intro">
            <span className="eyebrow">Welcome back</span>
            <h1>Client Login</h1>
            <p>Access your documents, appointments, payments, and active services.</p>
          </div>

          <label>
            Email
            <input name="email" onChange={handleChange} required type="email" value={form.email} />
          </label>

          <label>
            Password
            <input
              name="password"
              onChange={handleChange}
              required
              type="password"
              value={form.password}
            />
          </label>

          {error ? <p className="form-message error">{error}</p> : null}

          <button className="button button-primary" disabled={submitting} type="submit">
            {submitting ? 'Signing in...' : 'Login'}
          </button>

          <p className="auth-meta">
            Need an account? <Link to="/register">Create one here</Link>
          </p>
        </form>

        <article className="panel auth-visual" aria-hidden="true">
          <div className="auth-visual-media">
            <img alt="PK Business professional reviewing tax file documents" src={loginTaxFile} />
          </div>
        </article>
      </div>
    </section>
  )
}

export default Login
