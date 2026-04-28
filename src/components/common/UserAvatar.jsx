import { getInitials, resolveUploadUrl } from '../../lib/uploads.js'

function UserAvatar({ user, className = '', alt = 'User profile image' }) {
  const imageUrl = resolveUploadUrl(user?.profileImage)
  const initials = getInitials(user?.name) || 'U'
  const classes = ['user-avatar', className].filter(Boolean).join(' ')

  return (
    <div className={classes}>
      {imageUrl ? <img alt={alt} src={imageUrl} /> : <span>{initials}</span>}
    </div>
  )
}

export default UserAvatar
