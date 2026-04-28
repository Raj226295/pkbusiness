import { useEffect, useState } from 'react'
import UserAvatar from '../../components/common/UserAvatar.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import api, { extractApiError } from '../../lib/api.js'
import { useAuth } from '../../context/AuthContext.jsx'

function Profile() {
  const { user, updateUser } = useAuth()
  const [profileImage, setProfileImage] = useState(null)
  const [imageInputKey, setImageInputKey] = useState(0)
  const [imageSubmitting, setImageSubmitting] = useState(false)
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

  const handleImageChange = (event) => {
    setProfileImage(event.target.files?.[0] || null)
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

  const uploadProfileImage = async (event) => {
    event.preventDefault()

    if (!profileImage) {
      setStatus({ type: 'error', message: 'Please choose an image to upload.' })
      return
    }

    setImageSubmitting(true)
    setStatus({ type: '', message: '' })

    const payload = new FormData()
    payload.append('profileImage', profileImage)

    try {
      const { data } = await api.put('/api/user/profile/image', payload, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      updateUser(data.user)
      setProfileImage(null)
      setImageInputKey((current) => current + 1)
      setStatus({ type: 'success', message: 'Profile image updated successfully.' })
    } catch (error) {
      setStatus({ type: 'error', message: extractApiError(error) })
    } finally {
      setImageSubmitting(false)
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
        description="Maintain your contact details, update your profile image, and keep your account secure."
        eyebrow="Profile"
        title="Account Settings"
      />

      {status.message ? <p className={`form-message ${status.type}`}>{status.message}</p> : null}

      <section className="card-grid two-up">
        <article className="panel form-panel">
          <h3>Profile photo</h3>
          <div className="profile-avatar-panel">
            <UserAvatar alt={`${user?.name || 'User'} profile image`} className="profile-avatar-lg" user={user} />
          </div>
          <form className="profile-image-form" onSubmit={uploadProfileImage}>
            <label>
              Upload image
              <input
                accept="image/*"
                key={imageInputKey}
                name="profileImage"
                onChange={handleImageChange}
                type="file"
              />
            </label>
            <button className="button button-secondary" disabled={imageSubmitting} type="submit">
              {imageSubmitting ? 'Uploading...' : 'Upload Photo'}
            </button>
          </form>
        </article>

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
      </section>

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
    </div>
  )
}

export default Profile
