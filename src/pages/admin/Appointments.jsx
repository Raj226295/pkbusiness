import { useEffect, useMemo, useState } from 'react'
import PageHeader from '../../components/common/PageHeader.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import Loader from '../../components/common/Loader.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import api, { extractApiError } from '../../lib/api.js'
import { formatDateTime } from '../../lib/formatters.js'

function toDateTimeLocalValue(value) {
  if (!value) return ''
  const date = new Date(value)
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16)
}

function buildCalendarDays(appointments) {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  const days = []

  for (let day = 1; day <= endOfMonth.getDate(); day += 1) {
    const currentDate = new Date(now.getFullYear(), now.getMonth(), day)
    const total = appointments.filter((appointment) => {
      const scheduled = new Date(appointment.scheduledFor)
      return (
        scheduled.getFullYear() === currentDate.getFullYear() &&
        scheduled.getMonth() === currentDate.getMonth() &&
        scheduled.getDate() === currentDate.getDate()
      )
    }).length

    days.push({
      label: currentDate.toLocaleDateString('en-IN', { weekday: 'short' }),
      day,
      isToday: day === now.getDate(),
      total,
    })
  }

  return {
    monthLabel: startOfMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
    days,
  }
}

const initialForm = {
  userId: '',
  scheduledFor: '',
  notes: '',
  adminNotes: '',
  status: 'confirmed',
}

function Appointments() {
  const [appointments, setAppointments] = useState([])
  const [users, setUsers] = useState([])
  const [updates, setUpdates] = useState({})
  const [form, setForm] = useState(initialForm)
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState({ type: '', message: '' })

  const loadData = async () => {
    const [{ data: appointmentsData }, { data: usersData }] = await Promise.all([
      api.get('/api/admin/appointments'),
      api.get('/api/admin/users'),
    ])

    const clientUsers = (usersData.users || []).filter((user) => user.role !== 'admin')
    setAppointments(appointmentsData.appointments || [])
    setUsers(clientUsers)
    setForm((current) => ({
      ...current,
      userId: clientUsers.some((user) => user._id === current.userId) ? current.userId : clientUsers[0]?._id || '',
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

  const filteredAppointments = useMemo(() => {
    if (filter === 'all') return appointments
    return appointments.filter((appointment) => appointment.status === filter)
  }, [appointments, filter])

  const calendar = useMemo(() => buildCalendarDays(appointments), [appointments])

  const handleFormChange = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }))
  }

  const createAppointment = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setStatus({ type: '', message: '' })

    try {
      await api.post('/api/admin/appointments', form)
      setForm((current) => ({
        ...initialForm,
        userId: current.userId,
      }))
      await loadData()
      setStatus({ type: 'success', message: 'Appointment booked successfully.' })
    } catch (error) {
      setStatus({ type: 'error', message: extractApiError(error) })
    } finally {
      setSubmitting(false)
    }
  }

  const saveUpdate = async (appointment) => {
    try {
      await api.patch(`/api/admin/appointments/${appointment._id}`, updates[appointment._id] || {
        status: appointment.status,
        scheduledFor: appointment.scheduledFor,
        adminNotes: appointment.adminNotes || '',
      })
      await loadData()
      setStatus({ type: 'success', message: 'Appointment updated successfully.' })
    } catch (error) {
      setStatus({ type: 'error', message: extractApiError(error) })
    }
  }

  if (loading) {
    return <Loader message="Loading appointment desk..." />
  }

  return (
    <div className="page-stack">
      <PageHeader
        description="Confirm, reject, reschedule, or manually create consultation appointments from one admin calendar."
        eyebrow="Appointment"
        title="Appointment Desk"
      />

      {status.message ? <p className={`form-message ${status.type}`}>{status.message}</p> : null}

      <section className="card-grid two-up">
        <article className="panel admin-calendar-panel">
          <div className="admin-subpanel-head">
            <h3>{calendar.monthLabel}</h3>
            <span className="admin-muted-text">{appointments.length} total requests</span>
          </div>

          <div className="admin-calendar-grid">
            {calendar.days.map((day) => (
              <div className={`admin-calendar-day ${day.isToday ? 'today' : ''}`} key={day.day}>
                <span>{day.label}</span>
                <strong>{day.day}</strong>
                <small>{day.total} appt</small>
              </div>
            ))}
          </div>
        </article>

        <form className="panel form-panel" onSubmit={createAppointment}>
          <h3>Book appointment manually</h3>
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
            Date & time
            <input
              min={new Date().toISOString().slice(0, 16)}
              name="scheduledFor"
              onChange={handleFormChange}
              required
              type="datetime-local"
              value={form.scheduledFor}
            />
          </label>
          <label>
            Status
            <select name="status" onChange={handleFormChange} value={form.status}>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Awaiting</option>
              <option value="scheduled">Scheduled</option>
            </select>
          </label>
          <label>
            Client note
            <textarea name="notes" onChange={handleFormChange} rows="3" value={form.notes} />
          </label>
          <label>
            Admin note
            <textarea name="adminNotes" onChange={handleFormChange} rows="3" value={form.adminNotes} />
          </label>
          <button className="button button-primary" disabled={submitting} type="submit">
            {submitting ? 'Booking...' : 'Create Appointment'}
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="admin-folder-detail-head">
          <div>
            <span className="admin-surface-eyebrow">Request Queue</span>
            <h3>Upcoming and requested appointments</h3>
          </div>

          <select onChange={(event) => setFilter(event.target.value)} value={filter}>
            <option value="all">All statuses</option>
            <option value="pending">Awaiting</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {filteredAppointments.length ? (
          <div className="admin-record-list">
            {filteredAppointments.map((appointment) => {
              const draft = updates[appointment._id] || {
                status: appointment.status,
                scheduledFor: toDateTimeLocalValue(appointment.scheduledFor),
                adminNotes: appointment.adminNotes || '',
              }

              return (
                <article className="admin-record-card" key={appointment._id}>
                  <div className="admin-record-header">
                    <div>
                      <strong>{appointment.user?.name || 'Unknown client'}</strong>
                      <p>{appointment.user?.email || 'No email available'}</p>
                      <div className="admin-meta-row">
                        <span>{formatDateTime(appointment.scheduledFor)}</span>
                        <span>{appointment.user?.phone || 'No phone added'}</span>
                      </div>
                    </div>
                    <StatusBadge status={appointment.status} />
                  </div>

                  {appointment.notes ? <p className="admin-client-note">Client note: {appointment.notes}</p> : null}

                  <div className="admin-inline-editor">
                    <label>
                      Date & time
                      <input
                        min={new Date().toISOString().slice(0, 16)}
                        onChange={(event) =>
                          setUpdates((current) => ({
                            ...current,
                            [appointment._id]: {
                              status: current[appointment._id]?.status || appointment.status,
                              scheduledFor: event.target.value,
                              adminNotes: current[appointment._id]?.adminNotes ?? appointment.adminNotes ?? '',
                            },
                          }))
                        }
                        type="datetime-local"
                        value={draft.scheduledFor}
                      />
                    </label>
                    <label>
                      Status
                      <select
                        onChange={(event) =>
                          setUpdates((current) => ({
                            ...current,
                            [appointment._id]: {
                              status: event.target.value,
                              scheduledFor: current[appointment._id]?.scheduledFor || toDateTimeLocalValue(appointment.scheduledFor),
                              adminNotes: current[appointment._id]?.adminNotes ?? appointment.adminNotes ?? '',
                            },
                          }))
                        }
                        value={draft.status}
                      >
                        <option value="pending">Awaiting</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="completed">Completed</option>
                        <option value="rejected">Rejected</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </label>
                  </div>

                  <label>
                    Admin note
                    <textarea
                      onChange={(event) =>
                        setUpdates((current) => ({
                          ...current,
                          [appointment._id]: {
                            status: current[appointment._id]?.status || appointment.status,
                            scheduledFor: current[appointment._id]?.scheduledFor || toDateTimeLocalValue(appointment.scheduledFor),
                            adminNotes: event.target.value,
                          },
                        }))
                      }
                      rows="3"
                      value={draft.adminNotes}
                    />
                  </label>

                  <button className="button button-primary button-compact" onClick={() => saveUpdate(appointment)} type="button">
                    Save Appointment
                  </button>
                </article>
              )
            })}
          </div>
        ) : (
          <EmptyState description="There are no appointments matching this status filter." title="No appointments found" />
        )}
      </section>
    </div>
  )
}

export default Appointments
