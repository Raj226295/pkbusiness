import { getInitials, resolveUploadUrl } from '../../lib/uploads.js'

function clamp(value, min, max, fallback) {
  const parsedValue = Number.parseFloat(value)

  if (Number.isNaN(parsedValue)) {
    return fallback
  }

  return Math.min(Math.max(parsedValue, min), max)
}

function UserAvatar({ user, className = '', alt = 'User profile image', imageUrl: imageUrlOverride = '', settings }) {
  const imageUrl = imageUrlOverride || resolveUploadUrl(user?.profileImage)
  const initials = getInitials(user?.name) || 'U'
  const classes = ['user-avatar', className].filter(Boolean).join(' ')
  const zoom = clamp(settings?.zoom ?? user?.profileImageZoom, 1, 2.5, 1)
  const offsetX = clamp(settings?.offsetX ?? user?.profileImageOffsetX, -35, 35, 0)
  const offsetY = clamp(settings?.offsetY ?? user?.profileImageOffsetY, -35, 35, 0)
  const imageStyle = {
    objectPosition: `${50 + offsetX}% ${50 + offsetY}%`,
    transform: `scale(${zoom})`,
  }

  return (
    <div className={classes}>
      {imageUrl ? <img alt={alt} src={imageUrl} style={imageStyle} /> : <span>{initials}</span>}
    </div>
  )
}

export default UserAvatar
