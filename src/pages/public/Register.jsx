import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { extractApiError } from '../../lib/api.js'

function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

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
      const user = await register(form)
      navigate(user.role === 'admin' ? '/admin' : '/dashboard')
    } catch (err) {
      setError(extractApiError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="auth-shell container">
      <form className="panel auth-card" onSubmit={handleSubmit}>
        <span className="eyebrow">Create your workspace</span>
        <h1>Register</h1>
        <p>Set up your secure client portal to share documents and track services.</p>

        <label>
          Full Name
          <input name="name" onChange={handleChange} required type="text" value={form.name} />
        </label>

        <label>
          Email
          <input name="email" onChange={handleChange} required type="email" value={form.email} />
        </label>

        <label>
          Phone
          <input name="phone" onChange={handleChange} required type="tel" value={form.phone} />
        </label>

        <label>
          Password
          <input
            minLength="6"
            name="password"
            onChange={handleChange}
            required
            type="password"
            value={form.password}
          />
        </label>

        {error ? <p className="form-message error">{error}</p> : null}

        <button className="button button-primary" disabled={submitting} type="submit">
          {submitting ? 'Creating account...' : 'Register'}
        </button>

        <p className="auth-meta">
          Already registered? <Link to="/login">Login here</Link>
        </p>
      </form>
    </section>
  )
}

export default Register
