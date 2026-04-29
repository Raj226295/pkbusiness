import { useEffect, useMemo, useState } from 'react'
import PageHeader from '../../components/common/PageHeader.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import Loader from '../../components/common/Loader.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import api, { extractApiError } from '../../lib/api.js'
import { formatCurrency, formatDate, formatDateTime } from '../../lib/formatters.js'

const initialUserForm = {
  name: '',
  email: '',
  phone: '',
  companyName: '',
  password: '',
}

const initialMessageForm = {
  title: 'Admin update',
  message: '',
}

function Users() {
  const [users, setUsers] = useState([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [userForm, setUserForm] = useState(initialUserForm)
  const [messageForm, setMessageForm] = useState(initialMessageForm)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [messaging, setMessaging] = useState(false)
  const [status, setStatus] = useState({ type: '', message: '' })

  const clientUsers = useMemo(() => users.filter((user) => user.role !== 'admin'), [users])

  const filteredUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    return clientUsers.filter((user) => {
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
  }, [clientUsers, searchTerm, statusFilter])

  const selectedUserSummary = useMemo(() => {
    if (!selectedUser) {
      return null
    }

    const paidAmount = selectedUser.payments
      .filter((payment) => payment.status === 'paid')
      .reduce((total, payment) => total + Number(payment.amount || 0), 0)

    return {
      documents: selectedUser.documents.length,
      services: selectedUser.services.length,
      appointments: selectedUser.appointments.length,
      payments: selectedUser.payments.length,
      revenue: paidAmount,
    }
  }, [selectedUser])

  const loadUsers = async () => {
    const { data } = await api.get('/api/admin/users')
    const records = data.users || []
    const visibleUsers = records.filter((user) => user.role !== 'admin')

    setUsers(records)
    setSelectedUserId((current) => {
      if (visibleUsers.some((user) => user._id === current)) {
        return current
      }

      return visibleUsers[0]?._id || ''
    })
  }

  const loadUserDetails = async (userId) => {
    if (!userId) {
      setSelectedUser(null)
      return
    }

    setDetailLoading(true)

    try {
      const { data } = await api.get(`/api/admin/users/${userId}`)
      setSelectedUser(data.user)
    } catch (error) {
      setStatus({ type: 'error', message: extractApiError(error) })
    } finally {
      setDetailLoading(false)
    }
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

  useEffect(() => {
    loadUserDetails(selectedUserId)
  }, [selectedUserId])

  const handleUserFormChange = (event) => {
    setUserForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }))
  }

  const handleMessageFormChange = (event) => {
    setMessageForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }))
  }

  const createUser = async (event) => {
    event.preventDefault()
    setCreating(true)
    setStatus({ type: '', message: '' })

    try {
      await api.post('/api/admin/users', userForm)
      setUserForm(initialUserForm)
      await loadUsers()
      setStatus({ type: 'success', message: 'Client created successfully.' })
    } catch (error) {
      setStatus({ type: 'error', message: extractApiError(error) })
    } finally {
      setCreating(false)
    }
  }

  const toggleUserBlock = async (userId, currentStatus) => {
    const nextAction = currentStatus ? 'unblock' : 'block'

    if (!window.confirm(`Do you want to ${nextAction} this user?`)) {
      return
    }

    try {
      await api.patch(`/api/admin/users/${userId}/block`, {
        isBlocked: !currentStatus,
      })
      await Promise.all([loadUsers(), loadUserDetails(userId)])
      setStatus({
        type: 'success',
        message: currentStatus ? 'User unblocked successfully.' : 'User blocked successfully.',
      })
    } catch (error) {
      setStatus({ type: 'error', message: extractApiError(error) })
    }
  }

  const deleteUser = async (userId) => {
    if (!window.confirm('Delete this client and all related records? This action cannot be undone.')) {
      return
    }

    try {
      await api.delete(`/api/admin/users/${userId}`)
      await loadUsers()
      setSelectedUser(null)
      setMessageForm(initialMessageForm)
      setStatus({ type: 'success', message: 'Client deleted successfully.' })
    } catch (error) {
      setStatus({ type: 'error', message: extractApiError(error) })
    }
  }

  const sendMessage = async (event) => {
    event.preventDefault()

    if (!selectedUser?._id) {
      return
    }

    setMessaging(true)
    setStatus({ type: '', message: '' })

    try {
      await api.post(`/api/admin/users/${selectedUser._id}/message`, messageForm)
      setMessageForm(initialMessageForm)
      await loadUserDetails(selectedUser._id)
      setStatus({ type: 'success', message: 'Admin response sent successfully.' })
    } catch (error) {
      setStatus({ type: 'error', message: extractApiError(error) })
    } finally {
      setMessaging(false)
    }
  }

  if (loading) {
    return <Loader message="Loading users..." />
  }

  return (
    <div className="page-stack">
      <PageHeader
        description="Create client accounts, search the user base, inspect full records, and send direct admin updates."
        eyebrow="Admin"
        title="Users"
      />

      {status.message ? <p className={`form-message ${status.type}`}>{status.message}</p> : null}

      <section className="card-grid two-up admin-user-tools-grid">
        <form className="panel form-panel" onSubmit={createUser}>
          <h3>Add new client</h3>
          <label>
            Name
            <input name="name" onChange={handleUserFormChange} required type="text" value={userForm.name} />
          </label>
          <label>
            Email
            <input name="email" onChange={handleUserFormChange} required type="email" value={userForm.email} />
          </label>
          <label>
            Phone
            <input name="phone" onChange={handleUserFormChange} required type="tel" value={userForm.phone} />
          </label>
          <label>
            Company Name
            <input name="companyName" onChange={handleUserFormChange} type="text" value={userForm.companyName} />
          </label>
          <label>
            Temporary Password
            <input
              minLength="6"
              name="password"
              onChange={handleUserFormChange}
              required
              type="password"
              value={userForm.password}
            />
          </label>
          <button className="button button-primary" disabled={creating} type="submit">
            {creating ? 'Creating...' : 'Create Client'}
          </button>
        </form>

        <article className="panel form-panel">
          <h3>Search & filter</h3>
          <label>
            Search client
            <input
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by name, email, or phone"
              type="text"
              value={searchTerm}
            />
          </label>
          <label>
            Status
            <select onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
              <option value="all">All users</option>
              <option value="active">Active only</option>
              <option value="blocked">Blocked only</option>
            </select>
          </label>

          <div className="document-summary-grid">
            <div className="document-stat-tile">
              <strong>{clientUsers.length}</strong>
              <span>Total clients</span>
            </div>
            <div className="document-stat-tile">
              <strong>{clientUsers.filter((user) => !user.isBlocked).length}</strong>
              <span>Active clients</span>
            </div>
            <div className="document-stat-tile">
              <strong>{clientUsers.filter((user) => user.isBlocked).length}</strong>
              <span>Blocked clients</span>
            </div>
            <div className="document-stat-tile">
              <strong>{filteredUsers.length}</strong>
              <span>Filtered result</span>
            </div>
          </div>
        </article>
      </section>

      <section className="split-section align-start admin-users-layout">
        <article className="panel client-folder-panel admin-users-directory">
          <div className="document-history-head">
            <div>
              <span className="eyebrow">Clients</span>
              <h3>Client directory</h3>
            </div>
            <span className="list-meta">{filteredUsers.length} records</span>
          </div>

          {filteredUsers.length ? (
            <div className="client-folder-list">
              {filteredUsers.map((user) => (
                <button
                  className={`client-folder-button ${selectedUserId === user._id ? 'active' : ''}`}
                  key={user._id}
                  onClick={() => setSelectedUserId(user._id)}
                  type="button"
                >
                  <div>
                    <strong>{user.name}</strong>
                    <span>{user.email}</span>
                  </div>
                  <div className="client-folder-counts">
                    <span>{user.phone}</span>
                    <span>{user.isBlocked ? 'Blocked' : 'Active'}</span>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState description="Try adjusting the filters or add a new client manually." title="No matching users found" />
          )}
        </article>

        <article className="panel client-folder-section admin-profile-panel">
          {detailLoading ? (
            <Loader message="Loading full profile..." />
          ) : selectedUser ? (
            <>
              <div className="document-history-head admin-profile-head">
                <div>
                  <span className="eyebrow">Full Profile</span>
                  <h3>{selectedUser.name}</h3>
                  <p>{selectedUser.email}</p>
                </div>
                <div className="admin-user-actions admin-profile-actions">
                  <StatusBadge status={selectedUser.isBlocked ? 'rejected' : 'approved'} />
                  <button
                    className={`button button-compact ${selectedUser.isBlocked ? 'button-secondary' : 'button-danger'}`}
                    onClick={() => toggleUserBlock(selectedUser._id, selectedUser.isBlocked)}
                    type="button"
                  >
                    {selectedUser.isBlocked ? 'Unblock' : 'Block'}
                  </button>
                  <button className="button button-ghost button-compact" onClick={() => deleteUser(selectedUser._id)} type="button">
                    Delete
                  </button>
                </div>
              </div>

              <div className="detail-row admin-profile-meta">
                <span>Phone: {selectedUser.phone || 'Not provided'}</span>
                <span>Company: {selectedUser.companyName || 'Not added'}</span>
                <span>Joined: {formatDate(selectedUser.createdAt)}</span>
              </div>

              {selectedUserSummary ? (
                <div className="document-summary-grid admin-profile-summary-grid">
                  <div className="document-stat-tile admin-profile-stat">
                    <strong>{selectedUserSummary.documents}</strong>
                    <span>Documents</span>
                  </div>
                  <div className="document-stat-tile admin-profile-stat">
                    <strong>{selectedUserSummary.services}</strong>
                    <span>Services</span>
                  </div>
                  <div className="document-stat-tile admin-profile-stat">
                    <strong>{selectedUserSummary.appointments}</strong>
                    <span>Appointments</span>
                  </div>
                  <div className="document-stat-tile admin-profile-stat">
                    <strong>{selectedUserSummary.payments}</strong>
                    <span>Payments</span>
                  </div>
                  <div className="document-stat-tile admin-profile-stat">
                    <strong>{formatCurrency(selectedUserSummary.revenue)}</strong>
                    <span>Paid revenue</span>
                  </div>
                </div>
              ) : null}

              <div className="card-grid two-up admin-user-detail-grid">
                <article className="card-inline admin-history-card">
                  <h4>Document history</h4>
                  {selectedUser.documents.length ? (
                    <div className="list-stack compact">
                      {selectedUser.documents.slice(0, 4).map((document) => (
                        <div className="list-item stretch" key={document._id}>
                          <div className="history-card-copy">
                            <strong>{document.title}</strong>
                            <p>{document.originalName || document.filename}</p>
                            <small>{formatDateTime(document.createdAt)}</small>
                          </div>
                          <StatusBadge status={document.status} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>No documents uploaded yet.</p>
                  )}
                </article>

                <article className="card-inline admin-history-card">
                  <h4>Payment history</h4>
                  {selectedUser.payments.length ? (
                    <div className="list-stack compact">
                      {selectedUser.payments.slice(0, 4).map((payment) => (
                        <div className="list-item stretch" key={payment._id}>
                          <div className="history-card-copy">
                            <strong>{payment.invoiceNumber}</strong>
                            <p>
                              {payment.serviceType} | {formatCurrency(payment.amount)}
                            </p>
                            <small>{formatDateTime(payment.createdAt)}</small>
                          </div>
                          <StatusBadge status={payment.verificationStatus || payment.status} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>No payments created yet.</p>
                  )}
                </article>

                <article className="card-inline admin-history-card">
                  <h4>Service records</h4>
                  {selectedUser.services.length ? (
                    <div className="list-stack compact">
                      {selectedUser.services.slice(0, 4).map((service) => (
                        <div className="list-item stretch" key={service._id}>
                          <div className="history-card-copy">
                            <strong>{service.type}</strong>
                            <p>{service.description || 'No description added'}</p>
                            <small>{service.price ? formatCurrency(service.price) : 'Price not set'}</small>
                          </div>
                          <StatusBadge status={service.status} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>No services assigned yet.</p>
                  )}
                </article>

                <article className="card-inline admin-history-card">
                  <h4>Appointments</h4>
                  {selectedUser.appointments.length ? (
                    <div className="list-stack compact">
                      {selectedUser.appointments.slice(0, 4).map((appointment) => (
                        <div className="list-item stretch" key={appointment._id}>
                          <div className="history-card-copy">
                            <strong>{formatDateTime(appointment.scheduledFor)}</strong>
                            <p>{appointment.notes || 'General consultation request'}</p>
                            <small>{appointment.adminNotes || 'No admin notes yet'}</small>
                          </div>
                          <StatusBadge status={appointment.status} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>No appointments booked yet.</p>
                  )}
                </article>
              </div>

              <section className="card-grid two-up admin-user-response-grid">
                <article className="card-inline admin-history-card">
                  <h4>Latest notifications</h4>
                  {selectedUser.notifications.length ? (
                    <div className="list-stack compact">
                      {selectedUser.notifications.map((notification) => (
                        <div className="list-item stretch" key={notification._id}>
                          <div className="history-card-copy">
                            <strong>{notification.title}</strong>
                            <p>{notification.message}</p>
                            <small>{formatDateTime(notification.createdAt)}</small>
                          </div>
                          <span className={`status-badge ${notification.read ? 'neutral' : 'warning'}`}>
                            {notification.read ? 'Read' : 'Unread'}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>No notifications sent yet.</p>
                  )}
                </article>

                <form className="card-inline form-panel admin-message-card" onSubmit={sendMessage}>
                  <h4>Send admin response</h4>
                  <label>
                    Title
                    <input name="title" onChange={handleMessageFormChange} type="text" value={messageForm.title} />
                  </label>
                  <label>
                    Message
                    <textarea
                      name="message"
                      onChange={handleMessageFormChange}
                      required
                      rows="5"
                      value={messageForm.message}
                    />
                  </label>
                  <button className="button button-primary" disabled={messaging} type="submit">
                    {messaging ? 'Sending...' : 'Send Update'}
                  </button>
                </form>
              </section>
            </>
          ) : (
            <EmptyState description="Select a client from the directory to open their full profile." title="No client selected" />
          )}
        </article>
      </section>
    </div>
  )
}

export default Users
