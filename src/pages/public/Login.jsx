import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { extractApiError } from '../../lib/api.js'

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
      navigate(redirectTo || (user.role === 'admin' ? '/admin' : '/dashboard'))
    } catch (err) {
      setError(extractApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="auth-shell container">
      <form className="panel auth-card" onSubmit={handleSubmit}>
        <span className="eyebrow">Welcome back</span>
        <h1>Client Login</h1>
        <p>Access your documents, appointments, payments, and active services.</p>

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
    </section>
  )
}

export default Login
