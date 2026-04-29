import { useEffect, useMemo, useState } from 'react'
import PageHeader from '../../components/common/PageHeader.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import Loader from '../../components/common/Loader.jsx'
import api, { extractApiError } from '../../lib/api.js'
import { formatDateTime } from '../../lib/formatters.js'

const initialForm = {
  scheduledFor: '',
  notes: '',
}

function Appointments() {
  const [appointments, setAppointments] = useState([])
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState({ type: '', message: '' })

  const summary = useMemo(() => {
    return {
      total: appointments.length,
      active: appointments.filter((appointment) =>
        ['pending', 'confirmed', 'scheduled'].includes(appointment.status),
      ).length,
      completed: appointments.filter((appointment) => appointment.status === 'completed').length,
    }
  }, [appointments])

  const loadAppointments = async () => {
    const { data } = await api.get('/api/appointments')
    setAppointments(data.appointments)
  }

  useEffect(() => {
    loadAppointments()
      .catch((error) => {
        setStatus({ type: 'error', message: extractApiError(error) })
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const handleChange = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setStatus({ type: '', message: '' })

    try {
      await api.post('/api/appointments', form)
      setForm(initialForm)
      await loadAppointments()
      setStatus({ type: 'success', message: 'Appointment booked successfully.' })
    } catch (error) {
      setStatus({ type: 'error', message: extractApiError(error) })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <Loader message="Loading appointments..." />
  }

  return (
    <div className="page-stack">
      <PageHeader
        description="Request a consultation, track approval status, and see admin scheduling notes once the meeting is reviewed."
        eyebrow="Appointments"
        title="Consultation Booking"
      />

      <section className="card-grid two-up">
        <form className="panel form-panel" onSubmit={handleSubmit}>
          <h3>Book a consultation</h3>
          <label>
            Preferred date & time
            <input
              min={new Date().toISOString().slice(0, 16)}
              name="scheduledFor"
              onChange={handleChange}
              required
              type="datetime-local"
              value={form.scheduledFor}
            />
          </label>
          <label>
            Notes
            <textarea
              name="notes"
              onChange={handleChange}
              placeholder="Add context for the discussion"
              rows="5"
              value={form.notes}
            />
          </label>

          {status.message ? <p className={`form-message ${status.type}`}>{status.message}</p> : null}

          <button className="button button-primary" disabled={submitting} type="submit">
            {submitting ? 'Booking...' : 'Book Consultation'}
          </button>
        </form>

        <article className="panel document-summary-panel">
          <h3>Appointment summary</h3>
          <div className="document-summary-grid">
            <div className="document-stat-tile">
              <strong>{summary.total}</strong>
              <span>Total requests</span>
            </div>
            <div className="document-stat-tile">
              <strong>{summary.active}</strong>
              <span>Active requests</span>
            </div>
            <div className="document-stat-tile">
              <strong>{summary.completed}</strong>
              <span>Completed</span>
            </div>
          </div>
          <ul className="bullet-list">
            <li>New bookings first go to admin for confirmation.</li>
            <li>Once reviewed, updated status and admin notes will appear in your history below.</li>
          </ul>
        </article>
      </section>

      {appointments.length ? (
        <div className="list-stack">
          {appointments.map((appointment) => (
            <article className="panel" key={appointment._id}>
              <div className="list-item stretch">
                <div>
                  <strong>{formatDateTime(appointment.scheduledFor)}</strong>
                  <p>{appointment.notes || 'General consultation request'}</p>
                  {appointment.adminNotes ? <small>Admin notes: {appointment.adminNotes}</small> : null}
                </div>
                <StatusBadge status={appointment.status} />
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState description="Your booked consultations will show up here." title="No appointments yet" />
      )}
    </div>
  )
}

export default Appointments
