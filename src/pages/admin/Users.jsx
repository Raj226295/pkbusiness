import { useEffect, useState } from 'react'
import PageHeader from '../../components/common/PageHeader.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import Loader from '../../components/common/Loader.jsx'
import api, { extractApiError } from '../../lib/api.js'
import { formatDate } from '../../lib/formatters.js'

function Users() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState({ type: '', message: '' })

  const loadUsers = async () => {
    const { data } = await api.get('/api/admin/users')
    setUsers(data.users)
  }

  useEffect(() => {
    loadUsers()
      .catch((error) => {
        setStatus({ type: 'error', message: extractApiError(error) })
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const toggleUserBlock = async (userId, currentStatus) => {
    const nextAction = currentStatus ? 'unblock' : 'block'

    if (!window.confirm(`Do you want to ${nextAction} this user?`)) {
      return
    }

    try {
      await api.patch(`/api/admin/users/${userId}/block`, {
        isBlocked: !currentStatus,
      })
      await loadUsers()
      setStatus({
        type: 'success',
        message: currentStatus ? 'User unblocked successfully.' : 'User blocked successfully.',
      })
    } catch (error) {
      setStatus({ type: 'error', message: extractApiError(error) })
    }
  }

  if (loading) {
    return <Loader message="Loading users..." />
  }

  return (
    <div className="page-stack">
      <PageHeader
        description="View registered users, their roles, and block or unblock access when needed."
        eyebrow="Admin"
        title="Users"
      />

      {status.message ? <p className={`form-message ${status.type}`}>{status.message}</p> : null}

      {users.length ? (
        <section className="card-grid two-up">
          {users.map((user) => (
            <article className="panel" key={user._id}>
              <div className="list-item">
                <div>
                  <strong>{user.name}</strong>
                  <p>{user.email}</p>
                </div>
                <div className="list-meta-group">
                  <span className="status-badge neutral">{user.role}</span>
                  <span className={`status-badge ${user.isBlocked ? 'danger' : 'success'}`}>
                    {user.isBlocked ? 'blocked' : 'active'}
                  </span>
                </div>
              </div>
              <div className="detail-row">
                <span>{user.phone || 'No phone added'}</span>
                <span>Joined {formatDate(user.createdAt)}</span>
              </div>
              {user.role !== 'admin' ? (
                <button
                  className={`button ${user.isBlocked ? 'button-secondary' : 'button-danger'}`}
                  onClick={() => toggleUserBlock(user._id, user.isBlocked)}
                  type="button"
                >
                  {user.isBlocked ? 'Unblock User' : 'Block User'}
                </button>
              ) : null}
            </article>
          ))}
        </section>
      ) : (
        <EmptyState description="Registered users will appear here." title="No users found" />
      )}
    </div>
  )
}

export default Users
