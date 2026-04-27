import { useEffect, useState } from 'react'
import PageHeader from '../../components/common/PageHeader.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import Loader from '../../components/common/Loader.jsx'
import api, { extractApiError } from '../../lib/api.js'

const initialForm = {
  userId: '',
  type: 'Income Tax Filing',
  priority: 'medium',
  notes: '',
}

function Services() {
  const [services, setServices] = useState([])
  const [users, setUsers] = useState([])
  const [form, setForm] = useState(initialForm)
  const [updates, setUpdates] = useState({})
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState({ type: '', message: '' })

  const loadData = async () => {
    const [servicesRes, usersRes] = await Promise.all([api.get('/api/admin/services'), api.get('/api/admin/users')])
    setServices(servicesRes.data.services)
    setUsers(usersRes.data.users.filter((user) => user.role !== 'admin'))
    setForm((current) => ({
      ...current,
      userId: current.userId || usersRes.data.users.find((user) => user.role !== 'admin')?._id || '',
    }))
  }

  useEffect(() => {
    loadData()
      .catch((error) => {
        setStatus({ type: 'error', message: extractApiError(error) })
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const handleFormChange = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }))
  }

  const assignService = async (event) => {
    event.preventDefault()

    try {
      await api.post('/api/admin/services', form)
      setForm((current) => ({ ...initialForm, userId: current.userId }))
      await loadData()
      setStatus({ type: 'success', message: 'Service assigned successfully.' })
    } catch (error) {
      setStatus({ type: 'error', message: extractApiError(error) })
    }
  }

  const updateField = (serviceId, field, value) => {
    setUpdates((current) => ({
      ...current,
      [serviceId]: {
        status: current[serviceId]?.status || 'pending',
        adminRemarks: current[serviceId]?.adminRemarks || '',
        [field]: value,
      },
    }))
  }

  const saveUpdate = async (serviceId) => {
    try {
      await api.patch(`/api/admin/services/${serviceId}`, updates[serviceId])
      await loadData()
      setStatus({ type: 'success', message: 'Service updated successfully.' })
    } catch (error) {
      setStatus({ type: 'error', message: extractApiError(error) })
    }
  }

  if (loading) {
    return <Loader message="Loading services..." />
  }

  return (
    <div className="page-stack">
      <PageHeader
        description="Assign new services to clients and keep progress updates current."
        eyebrow="Admin"
        title="Service Assignment"
      />

      {status.message ? <p className={`form-message ${status.type}`}>{status.message}</p> : null}

      <section className="card-grid two-up">
        <form className="panel form-panel" onSubmit={assignService}>
          <h3>Assign a new service</h3>
          <label>
            Client
            <select name="userId" onChange={handleFormChange} required value={form.userId}>
              {users.map((user) => (
                <option key={user._id} value={user._id}>
                  {user.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Service type
            <select name="type" onChange={handleFormChange} value={form.type}>
              <option>Income Tax Filing</option>
              <option>GST Registration & Return</option>
              <option>Audit Services</option>
              <option>Company Registration</option>
              <option>Accounting / Bookkeeping</option>
            </select>
          </label>
          <label>
            Priority
            <select name="priority" onChange={handleFormChange} value={form.priority}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
          <label>
            Notes
            <textarea name="notes" onChange={handleFormChange} rows="4" value={form.notes} />
          </label>
          <button className="button button-primary" type="submit">
            Assign Service
          </button>
        </form>

        <article className="panel">
          <h3>Active services</h3>
          {services.length ? (
            <div className="list-stack">
              {services.map((service) => {
                const draft = updates[service._id] || {
                  status: service.status,
                  adminRemarks: service.adminRemarks || '',
                }

                return (
                  <div className="card-inline" key={service._id}>
                    <div className="list-item">
                      <div>
                        <strong>{service.type}</strong>
                        <p>{service.user?.name || 'Unknown client'}</p>
                      </div>
                      <StatusBadge status={service.status} />
                    </div>
                    <div className="inline-form">
                      <select
                        onChange={(event) => updateField(service._id, 'status', event.target.value)}
                        value={draft.status}
                      >
                        <option value="pending">Pending</option>
                        <option value="in progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                      <input
                        onChange={(event) => updateField(service._id, 'adminRemarks', event.target.value)}
                        placeholder="Internal/client note"
                        type="text"
                        value={draft.adminRemarks}
                      />
                      <button className="button button-primary" onClick={() => saveUpdate(service._id)} type="button">
                        Update
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState description="Assigned services will appear here." title="No services yet" />
          )}
        </article>
      </section>
    </div>
  )
}

export default Services
