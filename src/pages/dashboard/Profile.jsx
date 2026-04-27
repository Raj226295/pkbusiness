import { useEffect, useState } from 'react'
import PageHeader from '../../components/common/PageHeader.jsx'
import api, { extractApiError } from '../../lib/api.js'
import { useAuth } from '../../context/AuthContext.jsx'

function Profile() {
  const { user, updateUser } = useAuth()
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    phone: '',
    companyName: '',
  })
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
  })
  const [status, setStatus] = useState({ type: '', message: '' })

  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        companyName: user.companyName || '',
      })
    }
  }, [user])

  const handleProfileChange = (event) => {
    setProfileForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }))
  }

  const handlePasswordChange = (event) => {
    setPasswordForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }))
  }

  const saveProfile = async (event) => {
    event.preventDefault()
    setStatus({ type: '', message: '' })

    try {
      const { data } = await api.put('/api/user/profile', profileForm)
      updateUser(data.user)
      setStatus({ type: 'success', message: 'Profile updated successfully.' })
    } catch (error) {
      setStatus({ type: 'error', message: extractApiError(error) })
    }
  }

  const changePassword = async (event) => {
    event.preventDefault()
    setStatus({ type: '', message: '' })

    try {
      await api.put('/api/user/password', passwordForm)
      setPasswordForm({ currentPassword: '', newPassword: '' })
      setStatus({ type: 'success', message: 'Password changed successfully.' })
    } catch (error) {
      setStatus({ type: 'error', message: extractApiError(error) })
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        description="Maintain your contact details and keep your account secure."
        eyebrow="Profile"
        title="Account Settings"
      />

      {status.message ? <p className={`form-message ${status.type}`}>{status.message}</p> : null}

      <section className="card-grid two-up">
        <form className="panel form-panel" onSubmit={saveProfile}>
          <h3>Update details</h3>
          <label>
            Name
            <input name="name" onChange={handleProfileChange} required type="text" value={profileForm.name} />
          </label>
          <label>
            Email
            <input name="email" onChange={handleProfileChange} required type="email" value={profileForm.email} />
          </label>
          <label>
            Phone
            <input name="phone" onChange={handleProfileChange} required type="tel" value={profileForm.phone} />
          </label>
          <label>
            Company Name
            <input name="companyName" onChange={handleProfileChange} type="text" value={profileForm.companyName} />
          </label>
          <button className="button button-primary" type="submit">
            Save Profile
          </button>
        </form>

        <form className="panel form-panel" onSubmit={changePassword}>
          <h3>Change password</h3>
          <label>
            Current password
            <input
              name="currentPassword"
              onChange={handlePasswordChange}
              required
              type="password"
              value={passwordForm.currentPassword}
            />
          </label>
          <label>
            New password
            <input
              minLength="6"
              name="newPassword"
              onChange={handlePasswordChange}
              required
              type="password"
              value={passwordForm.newPassword}
            />
          </label>
          <button className="button button-primary" type="submit">
            Update Password
          </button>
        </form>
      </section>
    </div>
  )
}

export default Profile
