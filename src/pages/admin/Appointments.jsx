import { useEffect, useMemo, useState } from 'react'
import PageHeader from '../../components/common/PageHeader.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import Loader from '../../components/common/Loader.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import UserAvatar from '../../components/common/UserAvatar.jsx'
import { serviceCatalog } from '../../data/siteData.js'
import api, { extractApiError } from '../../lib/api.js'
import { formatDateTime } from '../../lib/formatters.js'

const filterOptions = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

function normalizeAppointmentStatus(status = 'pending') {
  const normalized = String(status).trim().toLowerCase()

  if (normalized === 'confirmed') return 'approved'
  if (normalized === 'scheduled') return 'rescheduled'

  return normalized || 'pending'
}

function toDateTimeLocalValue(value) {
  if (!value) return ''

  const date = new Date(value)
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16)
}

function formatAppointmentDate(value) {
  if (!value) return 'Not available'

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function formatAppointmentTime(value) {
  if (!value) return 'Not available'

  return new Intl.DateTimeFormat('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function buildDraft(appointment) {
  return {
    adminNotes: appointment.adminNotes || '',
    rejectionReason: appointment.rejectionReason || '',
    scheduledFor: toDateTimeLocalValue(appointment.scheduledFor),
    serviceType: appointment.serviceType || appointment.selectedService || 'General consultation',
  }
}

function getCountByStatus(appointments, status) {
  if (status === 'all') {
    return appointments.length
  }

  return appointments.filter((appointment) => normalizeAppointmentStatus(appointment.status) === status).length
}

function AppointmentActionIcon({ type }) {
  if (type === 'view') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path
          d="M2.5 12s3.7-6 9.5-6 9.5 6 9.5 6-3.7 6-9.5 6-9.5-6-9.5-6Z"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    )
  }

  if (type === 'approve') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="m5 12 4.2 4.2L19 6.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      </svg>
    )
  }

  if (type === 'reject') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M6 6 18 18M18 6 6 18" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
      </svg>
    )
  }

  if (type === 'reschedule') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M7 3v4M17 3v4M4 9h16M6 5h12a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="m9 15 2 2 4-4" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      </svg>
    )
  }

  if (type === 'complete') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M12 3a9 9 0 1 0 9 9" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
        <path d="m9 12.5 2.2 2.2L20 6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      </svg>
    )
  }

  if (type === 'cancel') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M5 7h14M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7m-8 0 1 11a2 2 0 0 0 2 1.8h4a2 2 0 0 0 2-1.8L17 7" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      </svg>
    )
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  )
}

function Appointments() {
  const [appointments, setAppointments] = useState([])
  const [drafts, setDrafts] = useState({})
  const [filter, setFilter] = useState('all')
  const [expandedId, setExpandedId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [workingKey, setWorkingKey] = useState('')
  const [status, setStatus] = useState({ type: '', message: '' })

  const serviceOptions = useMemo(() => {
    return Array.from(
      new Set([
        'General consultation',
        ...serviceCatalog.map((service) => service.title),
        ...appointments.map((appointment) => appointment.selectedService || appointment.serviceType).filter(Boolean),
      ]),
    )
  }, [appointments])

  const loadAppointments = async () => {
    const { data } = await api.get('/api/admin/appointments')
    setAppointments(data.appointments || [])
    setDrafts((current) => {
      const nextDrafts = {}

      for (const appointment of data.appointments || []) {
        nextDrafts[appointment._id] = current[appointment._id] || buildDraft(appointment)
      }

      return nextDrafts
    })
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

  const summaryCards = useMemo(() => {
    return [
      { label: 'Total Requests', value: appointments.length },
      { label: 'Pending Review', value: getCountByStatus(appointments, 'pending') },
      { label: 'Approved', value: getCountByStatus(appointments, 'approved') },
      { label: 'Completed', value: getCountByStatus(appointments, 'completed') },
      { label: 'Cancelled', value: getCountByStatus(appointments, 'cancelled') },
    ]
  }, [appointments])

  const filteredAppointments = useMemo(() => {
    if (filter === 'all') {
      return appointments
    }

    return appointments.filter((appointment) => normalizeAppointmentStatus(appointment.status) === filter)
  }, [appointments, filter])

  const updateDraftField = (appointmentId, field, value) => {
    setDrafts((current) => ({
      ...current,
      [appointmentId]: {
        ...(current[appointmentId] || {}),
        [field]: value,
      },
    }))
  }

  const runUpdate = async (appointment, payload, successMessage, actionKey) => {
    setWorkingKey(`${appointment._id}:${actionKey}`)
    setStatus({ type: '', message: '' })

    try {
      await api.patch(`/api/admin/appointments/${appointment._id}`, payload)
      await loadAppointments()
      setStatus({ type: 'success', message: successMessage })
    } catch (error) {
      setStatus({ type: 'error', message: extractApiError(error) })
    } finally {
      setWorkingKey('')
    }
  }

  const handleApprove = (appointment) => {
    const draft = drafts[appointment._id] || buildDraft(appointment)

    runUpdate(
      appointment,
      {
        adminNotes: draft.adminNotes,
        serviceType: draft.serviceType,
        status: 'approved',
      },
      'Appointment approved successfully.',
      'approve',
    )
  }

  const handleReject = (appointment) => {
    const draft = drafts[appointment._id] || buildDraft(appointment)

    if (!draft.rejectionReason?.trim()) {
      setStatus({ type: 'error', message: 'Please add a rejection reason before rejecting this appointment.' })
      setExpandedId(appointment._id)
      return
    }

    runUpdate(
      appointment,
      {
        adminNotes: draft.adminNotes,
        rejectionReason: draft.rejectionReason,
        serviceType: draft.serviceType,
        status: 'rejected',
      },
      'Appointment rejected successfully.',
      'reject',
    )
  }

  const handleReschedule = (appointment) => {
    const draft = drafts[appointment._id] || buildDraft(appointment)

    if (!draft.scheduledFor) {
      setStatus({ type: 'error', message: 'Please choose a new date and time before rescheduling.' })
      setExpandedId(appointment._id)
      return
    }

    runUpdate(
      appointment,
      {
        adminNotes: draft.adminNotes,
        scheduledFor: draft.scheduledFor,
        serviceType: draft.serviceType,
        status: 'rescheduled',
      },
      'Appointment rescheduled successfully.',
      'reschedule',
    )
  }

  const handleComplete = (appointment) => {
    const draft = drafts[appointment._id] || buildDraft(appointment)

    runUpdate(
      appointment,
      {
        adminNotes: draft.adminNotes,
        serviceType: draft.serviceType,
        status: 'completed',
      },
      'Appointment marked as completed.',
      'complete',
    )
  }

  const handleCancel = (appointment) => {
    const draft = drafts[appointment._id] || buildDraft(appointment)

    runUpdate(
      appointment,
      {
        adminNotes: draft.adminNotes,
        serviceType: draft.serviceType,
        status: 'cancelled',
      },
      'Appointment cancelled successfully.',
      'cancel',
    )
  }

  const handleSaveNotes = (appointment) => {
    const draft = drafts[appointment._id] || buildDraft(appointment)

    runUpdate(
      appointment,
      {
        adminNotes: draft.adminNotes,
        rejectionReason: normalizeAppointmentStatus(appointment.status) === 'rejected' ? draft.rejectionReason : '',
        scheduledFor: draft.scheduledFor || toDateTimeLocalValue(appointment.scheduledFor),
        serviceType: draft.serviceType,
        status: normalizeAppointmentStatus(appointment.status),
      },
      'Internal notes updated successfully.',
      'notes',
    )
  }

  if (loading) {
    return <Loader message="Loading appointment management..." />
  }

  return (
    <div className="page-stack admin-page-stack admin-appointment-page">
      <PageHeader
        description="Review every consultation request, approve or reject with context, reschedule meetings, track document and payment readiness, and keep internal notes in one responsive workspace."
        eyebrow="Appointment"
        title="Appointment Management"
      />

      {status.message ? <p className={`form-message ${status.type}`}>{status.message}</p> : null}

      <section className="admin-appointment-summary-grid">
        {summaryCards.map((card) => (
          <article className="admin-appointment-summary-card" key={card.label}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
          </article>
        ))}
      </section>

      <section className="admin-table-surface admin-appointment-dashboard">
        <div className="admin-table-head">
          <div>
            <span className="admin-surface-eyebrow">Request Queue</span>
            <h3>Appointment requests from all clients</h3>
            <p>Open any appointment to review the client message, update scheduling, add internal notes, or change status.</p>
          </div>

          <div className="admin-filter-chip-row">
            {filterOptions.map((option) => (
              <button
                className={`admin-filter-chip ${filter === option.value ? 'active' : ''}`}
                key={option.value}
                onClick={() => setFilter(option.value)}
                type="button"
              >
                <span>{option.label}</span>
                <strong>{getCountByStatus(appointments, option.value)}</strong>
              </button>
            ))}
          </div>
        </div>

        {filteredAppointments.length ? (
          <div className="admin-record-list admin-appointment-management-list">
            {filteredAppointments.map((appointment) => {
              const draft = drafts[appointment._id] || buildDraft(appointment)
              const normalizedStatus = normalizeAppointmentStatus(appointment.status)
              const isExpanded = expandedId === appointment._id
              const actionPrefix = `${appointment._id}:`
              const isWorking = workingKey.startsWith(actionPrefix)

              return (
                <article className={`admin-record-card admin-appointment-shell ${isExpanded ? 'expanded' : ''}`} key={appointment._id}>
                  <div className="admin-appointment-summary-row">
                    <div className="admin-appointment-primary">
                      <div className="admin-appointment-client-card">
                        <UserAvatar alt={`${appointment.user?.name || 'Client'} profile`} className="admin-table-avatar" user={appointment.user} />
                        <div className="admin-thread-copy">
                          <strong>{appointment.user?.name || 'Unknown client'}</strong>
                          <span>{appointment.user?.email || 'No email available'}</span>
                          <span>{appointment.user?.phone || 'No phone added'}</span>
                        </div>
                      </div>

                      <div className="admin-appointment-meta-list">
                        <div className="admin-message-summary-pill">
                          <span>{appointment.selectedService || appointment.serviceType || 'General consultation'}</span>
                        </div>
                        <span>{formatAppointmentDate(appointment.scheduledFor)}</span>
                        <span>{formatAppointmentTime(appointment.scheduledFor)}</span>
                        <span>Requested {formatDateTime(appointment.createdAt)}</span>
                      </div>
                    </div>

                    <div className="admin-appointment-status-stack">
                      <StatusBadge hiddenStatuses={[]} status={normalizedStatus} />
                      <button
                        className={`button button-ghost button-compact admin-appointment-toggle ${isExpanded ? 'active' : ''}`}
                        onClick={() => setExpandedId((current) => (current === appointment._id ? null : appointment._id))}
                        type="button"
                      >
                        <AppointmentActionIcon type="view" />
                        {isExpanded ? 'Hide Details' : 'View Details'}
                      </button>
                    </div>
                  </div>

                  <div className="admin-appointment-info-grid">
                    <div className="admin-appointment-detail-card">
                      <span className="admin-muted-label">Document Status</span>
                      <StatusBadge hiddenStatuses={[]} status={appointment.documentStatus || 'not submitted'} />
                    </div>
                    <div className="admin-appointment-detail-card">
                      <span className="admin-muted-label">Payment Status</span>
                      <StatusBadge hiddenStatuses={[]} status={appointment.paymentStatus || 'not initiated'} />
                    </div>
                    <div className="admin-appointment-detail-card">
                      <span className="admin-muted-label">Appointment Status</span>
                      <StatusBadge hiddenStatuses={[]} status={normalizedStatus} />
                    </div>
                  </div>

                  {isExpanded ? (
                    <div className="admin-appointment-detail-panel">
                      <div className="admin-appointment-message-card">
                        <span className="admin-muted-label">Client Message</span>
                        <p>{appointment.message || appointment.notes || 'No extra message was shared by the client.'}</p>
                      </div>

                      <div className="admin-appointment-editor-grid">
                        <label>
                          Selected service
                          <select
                            onChange={(event) => updateDraftField(appointment._id, 'serviceType', event.target.value)}
                            value={draft.serviceType}
                          >
                            {serviceOptions.map((service) => (
                              <option key={service} value={service}>
                                {service}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label>
                          Reschedule to
                          <input
                            min={new Date().toISOString().slice(0, 16)}
                            onChange={(event) => updateDraftField(appointment._id, 'scheduledFor', event.target.value)}
                            type="datetime-local"
                            value={draft.scheduledFor}
                          />
                        </label>

                        <label className="full-width">
                          Reject reason
                          <textarea
                            onChange={(event) => updateDraftField(appointment._id, 'rejectionReason', event.target.value)}
                            placeholder="Add a clear reason if you reject this request"
                            rows="3"
                            value={draft.rejectionReason}
                          />
                        </label>

                        <label className="full-width">
                          Internal admin notes
                          <textarea
                            onChange={(event) => updateDraftField(appointment._id, 'adminNotes', event.target.value)}
                            placeholder="Add internal notes, scheduling context, or completion remarks"
                            rows="4"
                            value={draft.adminNotes}
                          />
                        </label>
                      </div>

                      {appointment.rejectionReason ? (
                        <div className="admin-appointment-message-card secondary">
                          <span className="admin-muted-label">Saved rejection reason</span>
                          <p>{appointment.rejectionReason}</p>
                        </div>
                      ) : null}

                      <div className="admin-appointment-action-strip">
                        <button
                          className="admin-grid-button preview"
                          disabled={isWorking}
                          onClick={() => handleApprove(appointment)}
                          type="button"
                        >
                          <AppointmentActionIcon type="approve" />
                          {workingKey === `${appointment._id}:approve` ? 'Saving...' : 'Approve'}
                        </button>

                        <button
                          className="admin-grid-button block"
                          disabled={isWorking}
                          onClick={() => handleReschedule(appointment)}
                          type="button"
                        >
                          <AppointmentActionIcon type="reschedule" />
                          {workingKey === `${appointment._id}:reschedule` ? 'Saving...' : 'Reschedule'}
                        </button>

                        <button
                          className="admin-grid-button delete"
                          disabled={isWorking}
                          onClick={() => handleReject(appointment)}
                          type="button"
                        >
                          <AppointmentActionIcon type="reject" />
                          {workingKey === `${appointment._id}:reject` ? 'Saving...' : 'Reject'}
                        </button>

                        <button
                          className="button button-primary button-compact"
                          disabled={isWorking}
                          onClick={() => handleComplete(appointment)}
                          type="button"
                        >
                          <AppointmentActionIcon type="complete" />
                          {workingKey === `${appointment._id}:complete` ? 'Saving...' : 'Mark Completed'}
                        </button>

                        <button
                          className="button button-ghost button-compact"
                          disabled={isWorking}
                          onClick={() => handleCancel(appointment)}
                          type="button"
                        >
                          <AppointmentActionIcon type="cancel" />
                          {workingKey === `${appointment._id}:cancel` ? 'Saving...' : 'Cancel'}
                        </button>

                        <button
                          className="button button-secondary button-compact"
                          disabled={isWorking}
                          onClick={() => handleSaveNotes(appointment)}
                          type="button"
                        >
                          {workingKey === `${appointment._id}:notes` ? 'Saving...' : 'Save Notes'}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </article>
              )
            })}
          </div>
        ) : (
          <EmptyState
            description="There are no appointment requests matching the selected filter right now."
            title="No appointments found"
          />
        )}
      </section>
    </div>
  )
}

export default Appointments
