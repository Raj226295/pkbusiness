import { useEffect, useState } from 'react'
import PageHeader from '../../components/common/PageHeader.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import Loader from '../../components/common/Loader.jsx'
import api, { extractApiError } from '../../lib/api.js'
import { formatDate } from '../../lib/formatters.js'

function Appointments() {
  const [appointments, setAppointments] = useState([])
  const [updates, setUpdates] = useState({})
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState({ type: '', message: '' })

  const loadAppointments = async () => {
    const { data } = await api.get('/api/admin/appointments')
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

  const updateField = (appointmentId, value) => {
    setUpdates((current) => ({
      ...current,
      [appointmentId]: value,
    }))
  }

  const saveUpdate = async (appointmentId) => {
    try {
      await api.patch(`/api/admin/appointments/${appointmentId}`, {
        status: updates[appointmentId],
      })
      await loadAppointments()
      setStatus({ type: 'success', message: 'Appointment status updated.' })
    } catch (error) {
      setStatus({ type: 'error', message: extractApiError(error) })
    }
  }

  if (loading) {
    return <Loader message="Loading appointments..." />
  }

  return (
    <div className="page-stack">
      <PageHeader
        description="Review upcoming consultations and confirm, complete, or cancel them."
        eyebrow="Admin"
        title="Appointment Desk"
      />

      {status.message ? <p className={`form-message ${status.type}`}>{status.message}</p> : null}

      {appointments.length ? (
        <div className="list-stack">
          {appointments.map((appointment) => {
            const draftStatus = updates[appointment._id] || appointment.status

            return (
              <article className="panel" key={appointment._id}>
                <div className="list-item stretch">
                  <div>
                    <strong>{appointment.user?.name || 'Unknown client'}</strong>
                    <p>{formatDate(appointment.scheduledFor, { dateStyle: 'medium', timeStyle: 'short' })}</p>
                    <small>{appointment.notes || 'No additional notes provided.'}</small>
                  </div>
                  <StatusBadge status={appointment.status} />
                </div>
                <div className="inline-form">
                  <select onChange={(event) => updateField(appointment._id, event.target.value)} value={draftStatus}>
                    <option value="scheduled">Scheduled</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <button className="button button-primary" onClick={() => saveUpdate(appointment._id)} type="button">
                    Save
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <EmptyState description="Booked consultations will appear here." title="No appointments available" />
      )}
    </div>
  )
}

export default Appointments
