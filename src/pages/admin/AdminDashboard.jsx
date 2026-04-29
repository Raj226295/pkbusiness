import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Loader from '../../components/common/Loader.jsx'
import AdminIcon from '../../components/admin/AdminIcon.jsx'
import api, { extractApiError } from '../../lib/api.js'

function AdminDashboard() {
  const navigate = useNavigate()
  const [overview, setOverview] = useState(null)
  const [users, setUsers] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState({ type: '', message: '' })

  const loadDirectory = async () => {
    const [{ data: overviewData }, { data: usersData }] = await Promise.all([
      api.get('/api/admin/overview'),
      api.get('/api/admin/users'),
    ])

    const clientUsers = (usersData.users || []).filter((user) => user.role !== 'admin')
    setOverview(overviewData.overview)
    setUsers(clientUsers)
  }

  useEffect(() => {
    loadDirectory()
      .catch((error) => {
        setStatus({ type: 'error', message: extractApiError(error) })
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    return users.filter((user) => {
      const matchesSearch =
        !query ||
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        (user.phone || '').toLowerCase().includes(query)
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && !user.isBlocked) ||
        (statusFilter === 'blocked' && user.isBlocked)

      return matchesSearch && matchesStatus
    })
  }, [searchTerm, statusFilter, users])

  const openPreview = (userId) => {
    navigate(`/admin/clients/${userId}`)
  }

  const toggleUserBlock = async (user) => {
    const nextAction = user.isBlocked ? 'unblock' : 'block'

    if (!window.confirm(`Do you want to ${nextAction} ${user.name}?`)) {
      return
    }

    try {
      await api.patch(`/api/admin/users/${user._id}/block`, { isBlocked: !user.isBlocked })
      await loadDirectory()
      setStatus({
        type: 'success',
        message: user.isBlocked ? 'Client unblocked successfully.' : 'Client blocked successfully.',
      })
    } catch (error) {
      setStatus({ type: 'error', message: extractApiError(error) })
    }
  }

  const deleteUser = async (user) => {
    if (!window.confirm(`Delete ${user.name} and all related records? This cannot be undone.`)) {
      return
    }

    try {
      await api.delete(`/api/admin/users/${user._id}`)
      await loadDirectory()
      setStatus({ type: 'success', message: 'Client deleted successfully.' })
    } catch (error) {
      setStatus({ type: 'error', message: extractApiError(error) })
    }
  }

  if (loading) {
    return <Loader message="Loading admin workspace..." />
  }

  return (
    <div className="page-stack admin-page-stack">
      <section className="admin-kpi-grid">
        <article className="admin-kpi-card">
          <div className="admin-kpi-icon">
            <AdminIcon name="users" size={18} />
          </div>
          <span>Total Users</span>
          <strong>{overview?.totalUsers || users.length}</strong>
          <p>Active client records in the portal.</p>
        </article>

        <article className="admin-kpi-card">
          <div className="admin-kpi-icon">
            <AdminIcon name="bell" size={18} />
          </div>
          <span>New Notifications</span>
          <strong>{overview?.newNotifications || 0}</strong>
          <p>Open items waiting for an admin response.</p>
        </article>
      </section>

      {status.message ? <p className={`form-message ${status.type}`}>{status.message}</p> : null}

      <section className="panel admin-table-surface">
        <div className="admin-table-head">
          <div>
            <span className="admin-surface-eyebrow">User Directory</span>
            <h3>Client workspace overview</h3>
            <p>Delete, block, unblock, or open each client in a dedicated preview workspace.</p>
          </div>

          <div className="admin-table-controls">
            <label className="admin-search-field">
              <AdminIcon name="search" size={16} />
              <input
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by name, email, or phone"
                type="text"
                value={searchTerm}
              />
            </label>
            <select onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
              <option value="all">All Users</option>
              <option value="active">Active</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>
        </div>

        <div className="admin-user-table">
          <div className="admin-user-table-head">
            <span>Client</span>
            <span>Delete</span>
            <span>Block</span>
            <span>Preview</span>
          </div>

          {filteredUsers.length ? (
            filteredUsers.map((user) => (
              <article className="admin-user-row" key={user._id}>
                <div className="admin-user-cell">
                  <strong>{user.name}</strong>
                </div>

                <div className="admin-user-action-cell">
                  <button className="admin-grid-button delete" onClick={() => deleteUser(user)} type="button">
                    Delete
                  </button>
                </div>

                <div className="admin-user-action-cell">
                  <button
                    className={`admin-grid-button ${user.isBlocked ? 'unblock' : 'block'}`}
                    onClick={() => toggleUserBlock(user)}
                    type="button"
                  >
                    {user.isBlocked ? 'Unblock' : 'Block'}
                  </button>
                </div>

                <div className="admin-user-action-cell">
                  <button className="admin-grid-button preview" onClick={() => openPreview(user._id)} type="button">
                    Preview
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="admin-table-empty">
              <h4>No matching users</h4>
              <p>Try another search term or switch the account filter.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export default AdminDashboard
