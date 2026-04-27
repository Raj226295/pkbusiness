import { useEffect, useState } from 'react'
import PageHeader from '../../components/common/PageHeader.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import Loader from '../../components/common/Loader.jsx'
import api, { extractApiError } from '../../lib/api.js'
import { formatDate } from '../../lib/formatters.js'

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
        description="Schedule a consultation slot and keep a history of your previous meetings."
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

        <article className="panel">
          <h3>Appointment history</h3>
          {appointments.length ? (
            <div className="list-stack">
              {appointments.map((appointment) => (
                <div className="list-item stretch" key={appointment._id}>
                  <div>
                    <strong>{formatDate(appointment.scheduledFor, { dateStyle: 'medium', timeStyle: 'short' })}</strong>
                    <p>{appointment.notes || 'General consultation request'}</p>
                  </div>
                  <StatusBadge status={appointment.status} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState description="Your booked consultations will show up here." title="No appointments yet" />
          )}
        </article>
      </section>
    </div>
  )
}

export default Appointments
