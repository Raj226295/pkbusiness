import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import UserAvatar from '../../components/common/UserAvatar.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import api, { extractApiError } from '../../lib/api.js'
import { useAuth } from '../../context/AuthContext.jsx'

const defaultImageSettings = {
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
}

function Profile() {
  const { user, updateUser, logout } = useAuth()
  const navigate = useNavigate()
  const [profileImage, setProfileImage] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [imageSettings, setImageSettings] = useState(defaultImageSettings)
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
      setImageSettings({
        zoom: user.profileImageZoom ?? 1,
        offsetX: user.profileImageOffsetX ?? 0,
        offsetY: user.profileImageOffsetY ?? 0,
      })
    }
  }, [user])

  useEffect(() => {
    if (!profileImage) {
      setPreviewUrl('')
      return
    }

    const nextPreviewUrl = URL.createObjectURL(profileImage)
    setPreviewUrl(nextPreviewUrl)

    return () => {
      URL.revokeObjectURL(nextPreviewUrl)
    }
  }, [profileImage])

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

  const handleImageSettingChange = (event) => {
    const { name, value } = event.target

    setImageSettings((current) => ({
      ...current,
      [name]: Number(value),
    }))
  }

  const resetImageSettings = () => {
    setImageSettings(defaultImageSettings)
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

    if (!profileImage && !user?.profileImage) {
      setStatus({ type: 'error', message: 'Please choose an image to upload.' })
      return
    }

    setImageSubmitting(true)
    setStatus({ type: '', message: '' })

    const payload = new FormData()
    if (profileImage) {
      payload.append('profileImage', profileImage)
    }
    payload.append('zoom', String(imageSettings.zoom))
    payload.append('offsetX', String(imageSettings.offsetX))
    payload.append('offsetY', String(imageSettings.offsetY))

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

  const handleLogout = () => {
    logout()
    navigate('/')
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
            <UserAvatar
              alt={`${user?.name || 'User'} profile image`}
              className="profile-avatar-editor"
              imageUrl={previewUrl}
              settings={imageSettings}
              user={previewUrl ? { ...user, profileImage: '' } : user}
            />
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
            <div className="profile-image-editor">
              <div className="range-control">
                <div className="range-control-head">
                  <strong>Zoom</strong>
                  <span>{imageSettings.zoom.toFixed(2)}x</span>
                </div>
                <input
                  max="2.5"
                  min="1"
                  name="zoom"
                  onChange={handleImageSettingChange}
                  step="0.05"
                  type="range"
                  value={imageSettings.zoom}
                />
              </div>

              <div className="range-control">
                <div className="range-control-head">
                  <strong>Left / Right</strong>
                  <span>{imageSettings.offsetX}%</span>
                </div>
                <input
                  max="35"
                  min="-35"
                  name="offsetX"
                  onChange={handleImageSettingChange}
                  step="1"
                  type="range"
                  value={imageSettings.offsetX}
                />
              </div>

              <div className="range-control">
                <div className="range-control-head">
                  <strong>Up / Down</strong>
                  <span>{imageSettings.offsetY}%</span>
                </div>
                <input
                  max="35"
                  min="-35"
                  name="offsetY"
                  onChange={handleImageSettingChange}
                  step="1"
                  type="range"
                  value={imageSettings.offsetY}
                />
              </div>
            </div>
            <div className="profile-image-actions">
              <button className="button button-ghost" onClick={resetImageSettings} type="button">
                Reset Framing
              </button>
              <button className="button button-secondary" disabled={imageSubmitting} type="submit">
                {imageSubmitting ? 'Saving...' : 'Save Photo'}
              </button>
            </div>
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

      <article className="panel form-panel">
        <h3>Security settings</h3>
        <p>Use logout if you are on a shared device after finishing your work.</p>
        <button className="button button-ghost" onClick={handleLogout} type="button">
          Logout
        </button>
      </article>
    </div>
  )
}

export default Profile
