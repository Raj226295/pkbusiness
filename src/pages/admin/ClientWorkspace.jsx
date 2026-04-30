import { useCallback, useEffect, useMemo, useState } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import EmptyState from '../../components/common/EmptyState.jsx'
import Loader from '../../components/common/Loader.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import UserAvatar from '../../components/common/UserAvatar.jsx'
import api, { extractApiError } from '../../lib/api.js'
import { downloadFileFromApi } from '../../lib/downloads.js'
import { formatCurrency, formatDate, formatDateTime } from '../../lib/formatters.js'

const coreServices = [
  'Income Tax Filing',
  'GST Registration & Return',
  'Audit Services',
  'Accounting / Bookkeeping',
  'Company Registration',
  'Food License',
]

function toDateTimeLocalValue(value) {
  if (!value) return ''
  const date = new Date(value)
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16)
}

function getFileExtension(name = '') {
  const segments = String(name).split('.')
  return segments.length > 1 ? segments.at(-1).toUpperCase() : 'FILE'
}

function toServiceKey(name = '') {
  return String(name)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function buildServiceCards(user) {
  const serviceNames = new Set(coreServices)

  user.services?.forEach((service) => {
    if (service.type) {
      serviceNames.add(service.type)
    }
  })

  user.documents?.forEach((document) => {
    if (document.serviceType) {
      serviceNames.add(document.serviceType)
    }
  })

  return Array.from(serviceNames).map((serviceName) => {
    const documents = (user.documents || []).filter((document) => document.serviceType === serviceName)
    const assignment = (user.services || []).find((service) => service.type === serviceName)
    const hasUpdates =
      documents.some((document) => document.status === 'pending') ||
      Boolean(assignment?.requestedByClient) ||
      Boolean(assignment?.notes?.trim())

    return {
      serviceName,
      documents,
      assignment,
      hasUpdates,
      latestUpload: documents[0]?.createdAt || assignment?.updatedAt || '',
    }
  })
}

function hasPaymentUpdates(user) {
  return (
    user.payments?.some(
      (payment) => payment.verificationStatus === 'pending' || payment.status === 'pending',
    ) || false
  )
}

function hasAppointmentUpdates(user) {
  return (
    user.appointments?.some((appointment) =>
      ['pending', 'scheduled', 'confirmed'].includes(appointment.status),
    ) || false
  )
}

function hasProfileUpdates(user) {
  return user.notifications?.some((notification) => !notification.read) || false
}

function AdminClientWorkspace({ section = 'overview' }) {
  const { userId, serviceKey } = useParams()
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAvatarZoomOpen, setIsAvatarZoomOpen] = useState(false)
  const [status, setStatus] = useState({ type: '', message: '' })
  const [workingKey, setWorkingKey] = useState('')
  const [paymentDrafts, setPaymentDrafts] = useState({})
  const [appointmentDrafts, setAppointmentDrafts] = useState({})

  const loadUser = useCallback(async () => {
    if (!userId) {
      setUser(null)
      setLoading(false)
      return
    }

    try {
      const { data } = await api.get(`/api/admin/users/${userId}`)
      setUser(data.user)
    } catch (error) {
      setStatus({ type: 'error', message: extractApiError(error) })
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    setLoading(true)
    loadUser()
  }, [loadUser])

  const serviceCards = useMemo(() => buildServiceCards(user || {}), [user])

  const sectionAlerts = useMemo(
    () => ({
      services: serviceCards.some((service) => service.hasUpdates),
      appointments: hasAppointmentUpdates(user || {}),
      payments: hasPaymentUpdates(user || {}),
      profile: hasProfileUpdates(user || {}),
    }),
    [serviceCards, user],
  )

  const paidAmount = (user?.payments || [])
    .filter((payment) => payment.status === 'paid')
    .reduce((total, payment) => total + Number(payment.amount || 0), 0)

  const activeService = useMemo(
    () => serviceCards.find((service) => toServiceKey(service.serviceName) === serviceKey) || null,
    [serviceCards, serviceKey],
  )

  const navItems = useMemo(
    () => [
      {
        id: 'services',
        label: 'Services',
        to: `/admin/clients/${userId}/services`,
        hasUpdates: sectionAlerts.services,
      },
      {
        id: 'appointments',
        label: 'Appointment',
        to: `/admin/clients/${userId}/appointments`,
        hasUpdates: sectionAlerts.appointments,
      },
      {
        id: 'payments',
        label: 'Payment',
        to: `/admin/clients/${userId}/payments`,
        hasUpdates: sectionAlerts.payments,
      },
      {
        id: 'profile',
        label: 'Profile',
        to: `/admin/clients/${userId}/profile`,
        hasUpdates: sectionAlerts.profile,
      },
    ],
    [sectionAlerts, userId],
  )

  const savePaymentReview = async (payment) => {
    const draft = paymentDrafts[payment._id] || {
      verificationStatus: payment.verificationStatus || 'pending',
      transactionId: payment.transactionId || '',
      reviewRemarks: payment.reviewRemarks || '',
    }

    setWorkingKey(`payment-${payment._id}`)

    try {
      await api.patch(`/api/admin/payments/${payment._id}`, draft)
      await loadUser()
      setStatus({ type: 'success', message: 'Payment review updated successfully.' })
    } catch (error) {
      setStatus({ type: 'error', message: extractApiError(error) })
    } finally {
      setWorkingKey('')
    }
  }

  const saveAppointment = async (appointment, overrideDraft = null) => {
    const draft = overrideDraft || appointmentDrafts[appointment._id] || {
      status: appointment.status,
      scheduledFor: appointment.scheduledFor,
      adminNotes: appointment.adminNotes || '',
    }

    setWorkingKey(`appointment-${appointment._id}`)

    try {
      await api.patch(`/api/admin/appointments/${appointment._id}`, draft)
      await loadUser()
      setStatus({ type: 'success', message: 'Appointment updated successfully.' })
    } catch (error) {
      setStatus({ type: 'error', message: extractApiError(error) })
    } finally {
      setWorkingKey('')
    }
  }

  const handleAppointmentAction = async (appointment, nextStatus) => {
    const fallbackNote =
      nextStatus === 'scheduled'
        ? 'Appointment postponed by admin. Please review the new meeting time.'
        : nextStatus === 'rejected'
          ? 'Appointment request was rejected by admin.'
          : nextStatus === 'confirmed'
            ? 'Appointment confirmed by admin.'
            : ''

    const nextDraft = {
      status: nextStatus,
      scheduledFor: appointmentDrafts[appointment._id]?.scheduledFor || toDateTimeLocalValue(appointment.scheduledFor),
      adminNotes: appointmentDrafts[appointment._id]?.adminNotes || appointment.adminNotes || fallbackNote,
    }

    setAppointmentDrafts((current) => ({
      ...current,
      [appointment._id]: nextDraft,
    }))

    await saveAppointment(appointment, nextDraft)
  }

  const toggleUserBlock = async () => {
    if (!user) return

    const nextAction = user.isBlocked ? 'unblock' : 'block'

    if (!window.confirm(`Do you want to ${nextAction} ${user.name}?`)) {
      return
    }

    try {
      await api.patch(`/api/admin/users/${user._id}/block`, { isBlocked: !user.isBlocked })
      await loadUser()
      setStatus({
        type: 'success',
        message: user.isBlocked ? 'Client unblocked successfully.' : 'Client blocked successfully.',
      })
    } catch (error) {
      setStatus({ type: 'error', message: extractApiError(error) })
    }
  }

  const deleteUser = async () => {
    if (!user) return

    if (!window.confirm(`Delete ${user.name} and all related records? This cannot be undone.`)) {
      return
    }

    try {
      await api.delete(`/api/admin/users/${user._id}`)
      navigate('/admin', { replace: true })
    } catch (error) {
      setStatus({ type: 'error', message: extractApiError(error) })
    }
  }

  const handleProfileAvatarTap = () => {
    if (section === 'profile') {
      setIsAvatarZoomOpen(true)
      return
    }

    navigate(`/admin/clients/${userId}/profile`)
  }

  const closeAvatarZoom = () => {
    setIsAvatarZoomOpen(false)
  }

  const renderOverviewSection = () => (
    <div className="admin-client-overview">
      <article className="admin-subpanel">
        <div className="admin-subpanel-head admin-client-section-head">
          <div>
            <h3>{user.name} Workspace</h3>
            <p className="admin-muted-text">Choose a section to continue review</p>
          </div>
        </div>
        <p className="admin-muted-text">
          Open services, appointment requests, payment proofs, or profile updates from the right-side menu.
        </p>
        <div className="admin-kpi-grid admin-client-mini-stats">
          <article className="admin-preview-metric">
            <span>Total Documents</span>
            <strong>{user.documents.length}</strong>
          </article>
          <article className="admin-preview-metric">
            <span>Paid Revenue</span>
            <strong>{formatCurrency(paidAmount)}</strong>
          </article>
        </div>
      </article>

      <article className="admin-subpanel">
        <div className="admin-subpanel-head admin-client-section-head">
          <div>
            <h3>Attention Needed</h3>
            <p className="admin-muted-text">Blinking red dots mark fresh client updates</p>
          </div>
        </div>
        <div className="admin-client-workspace-links">
          {navItems.map((item) => (
            <NavLink
              className={({ isActive }) => `admin-client-link-card ${isActive ? 'active' : ''}`}
              key={item.id}
              to={item.to}
            >
              <span>{item.label}</span>
              {item.hasUpdates ? <span className="admin-notification-dot" /> : null}
            </NavLink>
          ))}
        </div>
      </article>
    </div>
  )

  const renderServicesSection = () => (
    <div className="admin-client-service-directory">
      <article className="admin-subpanel">
        <div className="admin-subpanel-head">
          <h3>All Services</h3>
          <span className="admin-muted-text">Tap any service to open that service documents page</span>
        </div>
        <div className="admin-client-service-list">
          {serviceCards.map((service) => (
            <button
              className="admin-client-service-item"
              key={service.serviceName}
              onClick={() => navigate(`/admin/clients/${userId}/services/${toServiceKey(service.serviceName)}`)}
              type="button"
            >
              <div className="admin-client-service-copy">
                <strong>{service.serviceName}</strong>
                <span>
                  {service.latestUpload
                    ? `Updated ${formatDateTime(service.latestUpload)}`
                    : service.assignment
                      ? 'Service assigned'
                      : 'Waiting for upload'}
                </span>
              </div>
              <div className="admin-client-service-meta">
                {service.hasUpdates ? <span className="admin-notification-dot" /> : null}
                <span className="admin-client-service-count">{service.documents.length} files</span>
              </div>
            </button>
          ))}
        </div>
      </article>
    </div>
  )

  const renderServiceDetailSection = () => (
    <div className="admin-client-service-detail-page">
      <article className="admin-subpanel admin-client-detail-panel">
        {activeService ? (
          <div className="admin-record-list">
            <div className="admin-subpanel-head">
              <div>
                <button
                  className="button button-ghost button-compact admin-client-back-link"
                  onClick={() => navigate(`/admin/clients/${userId}/services`)}
                  type="button"
                >
                  All Services
                </button>
                <h3>{activeService.serviceName}</h3>
                <p className="admin-muted-text">
                  {activeService.latestUpload
                    ? `Last update ${formatDateTime(activeService.latestUpload)}`
                    : 'No upload received yet'}
                </p>
              </div>
              <div className="admin-service-detail-actions">
                <button
                  className="button button-primary button-compact"
                  onClick={() => navigate(`/admin/folders/${userId}`)}
                  type="button"
                >
                  Open in My Folder
                </button>
                {activeService.assignment ? <StatusBadge status={activeService.assignment.status} /> : null}
              </div>
            </div>

            <div className="admin-client-service-summary-strip">
              <div className="admin-client-service-summary-card">
                <span>Total Files</span>
                <strong>{activeService.documents.length}</strong>
              </div>
              <div className="admin-client-service-summary-card">
                <span>New Updates</span>
                <strong>{activeService.hasUpdates ? 'Yes' : 'No'}</strong>
              </div>
              <div className="admin-client-service-summary-card">
                <span>Service Price</span>
                <strong>{formatCurrency(activeService.assignment?.price || 0)}</strong>
              </div>
            </div>

            {activeService.documents.length ? (
              activeService.documents.map((documentRecord) => {
                return (
                  <article className="admin-folder-file-row admin-folder-file-row-rich" key={documentRecord._id}>
                    <div>
                      <div className="admin-record-title-row">
                        <strong>{documentRecord.documentType || documentRecord.title}</strong>
                        {documentRecord.status === 'pending' ? <span className="admin-notification-dot" /> : null}
                      </div>
                      <p>{documentRecord.originalName || documentRecord.filename}</p>
                      <div className="admin-meta-row">
                        <span>{getFileExtension(documentRecord.originalName || documentRecord.filename)}</span>
                        <span>Uploaded: {formatDateTime(documentRecord.createdAt)}</span>
                        <span>
                          {documentRecord.uploadedBy?.role === 'admin' ? 'Shared by admin' : 'Submitted by user'}
                        </span>
                      </div>
                    </div>

                    <div className="admin-record-actions admin-service-document-actions">
                      <button
                        className="button button-primary button-compact admin-document-download"
                        onClick={() =>
                          downloadFileFromApi(
                            documentRecord.downloadUrl,
                            documentRecord.originalName || documentRecord.filename,
                          )
                        }
                        type="button"
                      >
                        Download
                      </button>
                      {documentRecord.fileUrl ? (
                        <a
                          className="button button-ghost button-compact"
                          href={documentRecord.fileUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          Preview
                        </a>
                      ) : null}
                    </div>
                  </article>
                )
              })
            ) : (
              <EmptyState
                description="This user has not uploaded any PDF or DOC file for this service yet."
                title="No service documents"
              />
            )}
          </div>
        ) : (
          <EmptyState
            description="This service could not be found for the selected client. Go back and choose another service."
            title="Service not found"
          />
        )}
      </article>
    </div>
  )

  const renderPaymentsSection = () =>
    user.payments.length ? (
      <div className="admin-record-list">
        {user.payments.map((payment) => {
          const draft = paymentDrafts[payment._id] || {
            verificationStatus: payment.verificationStatus || 'pending',
            transactionId: payment.transactionId || '',
            reviewRemarks: payment.reviewRemarks || '',
          }

          return (
            <article className="admin-record-card" key={payment._id}>
              <div className="admin-record-header">
                <div>
                  <div className="admin-record-title-row">
                    <strong>{payment.serviceType}</strong>
                    {(payment.verificationStatus === 'pending' || payment.status === 'pending') && (
                      <span className="admin-notification-dot" />
                    )}
                  </div>
                  <p>{payment.invoiceNumber}</p>
                </div>
                <div className="admin-status-pair">
                  <StatusBadge status={payment.status} />
                  <StatusBadge status={payment.verificationStatus || 'pending'} />
                </div>
              </div>

              <div className="admin-meta-row">
                <span>Price: {formatCurrency(payment.amount)}</span>
                <span>Transaction ID: {payment.transactionId || 'Not added'}</span>
                <span>Created: {formatDateTime(payment.createdAt)}</span>
              </div>

              {payment.screenshotUrl ? (
                <div className="admin-proof-card">
                  <img alt={`${payment.invoiceNumber} proof`} className="admin-proof-thumb" src={payment.screenshotUrl} />
                  <a
                    className="button button-ghost button-compact"
                    href={payment.screenshotUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Preview Screenshot
                  </a>
                </div>
              ) : null}

              <div className="admin-inline-editor">
                <label>
                  Verification
                  <select
                    onChange={(event) =>
                      setPaymentDrafts((current) => ({
                        ...current,
                        [payment._id]: {
                          verificationStatus: event.target.value,
                          transactionId: current[payment._id]?.transactionId ?? payment.transactionId ?? '',
                          reviewRemarks: current[payment._id]?.reviewRemarks ?? payment.reviewRemarks ?? '',
                        },
                      }))
                    }
                    value={draft.verificationStatus}
                  >
                    <option value="pending">Under review</option>
                    <option value="verified">Verified</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </label>
                <label>
                  Transaction ID
                  <input
                    onChange={(event) =>
                      setPaymentDrafts((current) => ({
                        ...current,
                        [payment._id]: {
                          verificationStatus:
                            current[payment._id]?.verificationStatus || payment.verificationStatus || 'pending',
                          transactionId: event.target.value,
                          reviewRemarks: current[payment._id]?.reviewRemarks ?? payment.reviewRemarks ?? '',
                        },
                      }))
                    }
                    type="text"
                    value={draft.transactionId}
                  />
                </label>
              </div>

              <label>
                Admin note
                <textarea
                  onChange={(event) =>
                    setPaymentDrafts((current) => ({
                      ...current,
                      [payment._id]: {
                        verificationStatus:
                          current[payment._id]?.verificationStatus || payment.verificationStatus || 'pending',
                        transactionId: current[payment._id]?.transactionId ?? payment.transactionId ?? '',
                        reviewRemarks: event.target.value,
                      },
                    }))
                  }
                  rows="3"
                  value={draft.reviewRemarks}
                />
              </label>

              <button
                className="button button-primary button-compact"
                disabled={workingKey === `payment-${payment._id}`}
                onClick={() => savePaymentReview(payment)}
                type="button"
              >
                {workingKey === `payment-${payment._id}`
                  ? 'Saving...'
                  : draft.verificationStatus === 'verified'
                    ? 'Verify Payment'
                    : 'Save Review'}
              </button>
            </article>
          )
        })}
      </div>
    ) : (
      <EmptyState
        description="Payment records will appear here once the client starts submitting proofs."
        title="No payments yet"
      />
    )

  const renderAppointmentsSection = () =>
    user.appointments.length ? (
      <div className="admin-record-list admin-appointment-stack">
        {user.appointments.map((appointment) => {
          const draft = appointmentDrafts[appointment._id] || {
            status: appointment.status,
            scheduledFor: toDateTimeLocalValue(appointment.scheduledFor),
            adminNotes: appointment.adminNotes || '',
          }

          return (
            <article className="admin-record-card admin-appointment-card" key={appointment._id}>
              <div className="admin-record-header">
                <div>
                  <div className="admin-record-title-row">
                    <strong>{formatDateTime(appointment.scheduledFor)}</strong>
                    {['pending', 'scheduled', 'confirmed'].includes(appointment.status) ? (
                      <span className="admin-notification-dot" />
                    ) : null}
                  </div>
                  <p>{appointment.notes || 'General consultation request'}</p>
                </div>
                <StatusBadge status={appointment.status} />
              </div>

              <div className="admin-appointment-meta-grid">
                <div className="admin-appointment-meta-card">
                  <span className="admin-muted-label">Booked On</span>
                  <strong>{formatDateTime(appointment.createdAt)}</strong>
                </div>
                <div className="admin-appointment-meta-card">
                  <span className="admin-muted-label">Requested For</span>
                  <strong>{formatDateTime(appointment.scheduledFor)}</strong>
                </div>
                <div className="admin-appointment-meta-card">
                  <span className="admin-muted-label">Current Status</span>
                  <strong>{appointment.status}</strong>
                </div>
              </div>

              <div className="admin-appointment-note-card">
                <span className="admin-muted-label">Client Note</span>
                <p>{appointment.notes || 'No extra note was shared by the client.'}</p>
              </div>

              <div className="admin-inline-editor admin-appointment-reschedule-row">
                <label className="grow">
                  Reschedule / Postpone To
                  <input
                    min={new Date().toISOString().slice(0, 16)}
                    onChange={(event) =>
                      setAppointmentDrafts((current) => ({
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
              </div>

              <label className="admin-appointment-note-editor">
                Admin note
                <textarea
                  onChange={(event) =>
                    setAppointmentDrafts((current) => ({
                      ...current,
                      [appointment._id]: {
                        status: current[appointment._id]?.status || appointment.status,
                        scheduledFor:
                          current[appointment._id]?.scheduledFor ||
                          toDateTimeLocalValue(appointment.scheduledFor),
                        adminNotes: event.target.value,
                      },
                    }))
                  }
                  rows="3"
                  value={draft.adminNotes}
                />
              </label>

              <div className="admin-appointment-action-row">
                <button
                  className="admin-grid-button preview admin-appointment-action"
                  disabled={workingKey === `appointment-${appointment._id}`}
                  onClick={() => handleAppointmentAction(appointment, 'confirmed')}
                  type="button"
                >
                  {workingKey === `appointment-${appointment._id}` ? 'Saving...' : 'Confirm'}
                </button>
                <button
                  className="admin-grid-button block admin-appointment-action"
                  disabled={workingKey === `appointment-${appointment._id}`}
                  onClick={() => handleAppointmentAction(appointment, 'scheduled')}
                  type="button"
                >
                  {workingKey === `appointment-${appointment._id}` ? 'Saving...' : 'Postpone'}
                </button>
                <button
                  className="admin-grid-button delete admin-appointment-action"
                  disabled={workingKey === `appointment-${appointment._id}`}
                  onClick={() => handleAppointmentAction(appointment, 'rejected')}
                  type="button"
                >
                  {workingKey === `appointment-${appointment._id}` ? 'Saving...' : 'Reject'}
                </button>
                <button
                  className="button button-ghost button-compact"
                  disabled={workingKey === `appointment-${appointment._id}`}
                  onClick={() => saveAppointment(appointment)}
                  type="button"
                >
                  {workingKey === `appointment-${appointment._id}` ? 'Saving...' : 'Update Note'}
                </button>
              </div>
            </article>
          )
        })}
      </div>
    ) : (
      <EmptyState
        description="Consultation requests will appear here after the client books one."
        title="No appointments yet"
      />
    )

  const renderProfileSection = () => (
    <div className="admin-client-profile-page">
      <article className="admin-subpanel admin-client-profile-card">
        <div className="admin-client-profile-shell">
          <div className="admin-client-profile-hero">
            <button
              aria-label={section === 'profile' ? `Preview ${user.name} profile` : `Open ${user.name} profile`}
              className="avatar-nav-button"
              onClick={handleProfileAvatarTap}
              type="button"
            >
              <UserAvatar alt={`${user.name} profile`} className="admin-client-profile-avatar" user={user} />
            </button>
            <div className="admin-client-profile-copy">
              <span className="admin-surface-eyebrow">Client Profile</span>
              <h3>{user.name}</h3>
              <p>{user.email}</p>
              <div className="admin-client-profile-badges">
                {user.isBlocked ? <StatusBadge hiddenStatuses={[]} status="rejected" /> : null}
              </div>
            </div>
          </div>

          <div className="admin-client-profile-grid">
            <article className="admin-client-profile-detail-card">
              <span className="admin-muted-label">Full Name</span>
              <strong>{user.name}</strong>
            </article>
            <article className="admin-client-profile-detail-card">
              <span className="admin-muted-label">Email Address</span>
              <strong>{user.email}</strong>
            </article>
            <article className="admin-client-profile-detail-card">
              <span className="admin-muted-label">Phone Number</span>
              <strong>{user.phone || 'Not provided'}</strong>
            </article>
            <article className="admin-client-profile-detail-card">
              <span className="admin-muted-label">Joined On</span>
              <strong>{formatDate(user.createdAt)}</strong>
            </article>
          </div>
        </div>
      </article>
    </div>
  )

  if (loading) {
    return <Loader message="Loading client workspace..." />
  }

  if (!user?._id) {
    return <EmptyState description="We could not load this client profile." title="Client not found" />
  }

  return (
    <div className="page-stack admin-page-stack admin-client-workspace">
      {status.message ? <p className={`form-message ${status.type}`}>{status.message}</p> : null}

      <section className="admin-preview-summary-row admin-client-workspace-hero">
        <article className="admin-preview-user-card admin-client-route-user-card">
          <button
            aria-label={section === 'profile' ? `Preview ${user.name} profile` : `Open ${user.name} profile`}
            className="avatar-nav-button"
            onClick={handleProfileAvatarTap}
            type="button"
          >
            <UserAvatar alt={`${user.name} profile`} className="admin-preview-avatar" user={user} />
          </button>
          <div className="admin-preview-user-copy">
            <strong>{user.name}</strong>
          </div>
          <div className="admin-preview-user-actions">
            {user.isBlocked ? <StatusBadge hiddenStatuses={[]} status="rejected" /> : null}
            <button
              className={`admin-grid-button ${user.isBlocked ? 'unblock' : 'block'}`}
              onClick={toggleUserBlock}
              type="button"
            >
              {user.isBlocked ? 'Unblock' : 'Block'}
            </button>
            <button className="admin-grid-button delete" onClick={deleteUser} type="button">
              Delete
            </button>
            <button className="button button-ghost button-compact" onClick={() => navigate('/admin')} type="button">
              Close
            </button>
          </div>
        </article>

        <nav className="admin-preview-tab-list admin-client-route-nav">
          {navItems.map((item) => (
            <NavLink
              className={({ isActive }) => `admin-preview-nav-item ${isActive ? 'active' : ''}`}
              key={item.id}
              to={item.to}
            >
              <span>{item.label}</span>
              {item.hasUpdates ? <span className="admin-preview-tab-dot" /> : null}
            </NavLink>
          ))}
        </nav>
      </section>

      <section className="panel admin-client-section-surface">
        {section === 'overview' ? renderOverviewSection() : null}
        {section === 'services' ? renderServicesSection() : null}
        {section === 'service-detail' ? renderServiceDetailSection() : null}
        {section === 'appointments' ? renderAppointmentsSection() : null}
        {section === 'payments' ? renderPaymentsSection() : null}
        {section === 'profile' ? renderProfileSection() : null}
      </section>

      {isAvatarZoomOpen ? (
        <div
          aria-modal="true"
          className="avatar-lightbox-backdrop"
          onClick={closeAvatarZoom}
          role="dialog"
        >
          <div className="avatar-lightbox-panel" onClick={(event) => event.stopPropagation()}>
            <button
              aria-label="Close profile preview"
              className="avatar-lightbox-close"
              onClick={closeAvatarZoom}
              type="button"
            >
              Close
            </button>
            <UserAvatar alt={`${user.name} enlarged profile`} className="avatar-lightbox-avatar" user={user} />
            <div className="avatar-lightbox-copy">
              <strong>{user.name}</strong>
              <span>{user.email}</span>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default AdminClientWorkspace
