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

  const deleteUser = async (userId) => {
    if (!window.confirm('Delete this user and their related records?')) {
      return
    }

    try {
      await api.delete(`/api/admin/users/${userId}`)
      await loadUsers()
      setStatus({ type: 'success', message: 'User deleted successfully.' })
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
        description="View registered users, their roles, and remove accounts when needed."
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
                <span className="status-badge neutral">{user.role}</span>
              </div>
              <div className="detail-row">
                <span>{user.phone || 'No phone added'}</span>
                <span>Joined {formatDate(user.createdAt)}</span>
              </div>
              {user.role !== 'admin' ? (
                <button className="button button-danger" onClick={() => deleteUser(user._id)} type="button">
                  Delete User
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
