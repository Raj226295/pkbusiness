import { useEffect, useMemo, useState } from 'react'
import EmptyState from '../common/EmptyState.jsx'
import StatusBadge from '../common/StatusBadge.jsx'
import UserAvatar from '../common/UserAvatar.jsx'
import api, { extractApiError } from '../../lib/api.js'
import { downloadFileFromApi } from '../../lib/downloads.js'
import { formatCurrency, formatDate, formatDateTime } from '../../lib/formatters.js'

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

function buildSectionAlerts(user) {
  if (!user) {
    return {
      profile: 0,
      services: 0,
      payments: 0,
      appointments: 0,
    }
  }

  const pendingDocuments = user.documents?.filter((document) => document.status === 'pending').length || 0

  return {
    profile: user.notifications?.filter((notification) => !notification.read).length || 0,
    services:
      (user.services?.filter((service) => service.status !== 'completed' || service.requestedByClient).length || 0) +
      pendingDocuments,
    payments:
      user.payments?.filter(
        (payment) => payment.verificationStatus === 'pending' || payment.status === 'pending',
      ).length || 0,
    appointments:
      user.appointments?.filter((appointment) =>
        ['pending', 'scheduled', 'confirmed'].includes(appointment.status),
      ).length || 0,
  }
}

function AdminUserPreviewPanel({
  onClose,
  onDeleteUser,
  onRefreshDirectory,
  onRefreshUser,
  onToggleBlock,
  setPageStatus,
  user,
}) {
  const [activeTab, setActiveTab] = useState('services')
  const [documentDrafts, setDocumentDrafts] = useState({})
  const [paymentDrafts, setPaymentDrafts] = useState({})
  const [appointmentDrafts, setAppointmentDrafts] = useState({})
  const [serviceDrafts, setServiceDrafts] = useState({})
  const [workingKey, setWorkingKey] = useState('')

  useEffect(() => {
    if (!user?._id) return
    setActiveTab('services')
    setDocumentDrafts({})
    setPaymentDrafts({})
    setAppointmentDrafts({})
    setServiceDrafts({})
  }, [user?._id])

  const sectionAlerts = useMemo(() => buildSectionAlerts(user), [user])
  const paidAmount = useMemo(
    () =>
      ((user?.payments) || [])
        .filter((payment) => payment.status === 'paid')
        .reduce((total, payment) => total + Number(payment.amount || 0), 0),
    [user?.payments],
  )

  const tabs = useMemo(
    () => [
      { id: 'services', label: 'Services', alertCount: sectionAlerts.services },
      { id: 'appointments', label: 'Appointment', alertCount: sectionAlerts.appointments },
      { id: 'payments', label: 'Payment', alertCount: sectionAlerts.payments },
      { id: 'profile', label: 'Profile', alertCount: sectionAlerts.profile },
    ],
    [sectionAlerts],
  )

  const refreshAfterMutation = async (message) => {
    await Promise.all([onRefreshUser?.(), onRefreshDirectory?.()])
    setPageStatus?.({ type: 'success', message })
  }

  const handleMutationError = (error) => {
    setPageStatus?.({ type: 'error', message: extractApiError(error) })
  }

  const saveDocumentReview = async (documentRecord) => {
    const draft = documentDrafts[documentRecord._id] || {
      status: documentRecord.status,
      remarks: documentRecord.remarks || '',
    }
    setWorkingKey(`document-${documentRecord._id}`)
    try {
      await api.patch(`/api/admin/documents/${documentRecord._id}`, draft)
      await refreshAfterMutation('Document review updated successfully.')
    } catch (error) {
      handleMutationError(error)
    } finally {
      setWorkingKey('')
    }
  }

  const savePaymentReview = async (payment) => {
    const draft = paymentDrafts[payment._id] || {
      verificationStatus: payment.verificationStatus || 'pending',
      transactionId: payment.transactionId || '',
      reviewRemarks: payment.reviewRemarks || '',
    }
    setWorkingKey(`payment-${payment._id}`)
    try {
      await api.patch(`/api/admin/payments/${payment._id}`, draft)
      await refreshAfterMutation('Payment review updated successfully.')
    } catch (error) {
      handleMutationError(error)
    } finally {
      setWorkingKey('')
    }
  }

  const saveAppointment = async (appointment) => {
    const draft = appointmentDrafts[appointment._id] || {
      status: appointment.status,
      scheduledFor: appointment.scheduledFor,
      adminNotes: appointment.adminNotes || '',
    }
    setWorkingKey(`appointment-${appointment._id}`)
    try {
      await api.patch(`/api/admin/appointments/${appointment._id}`, draft)
      await refreshAfterMutation('Appointment updated successfully.')
    } catch (error) {
      handleMutationError(error)
    } finally {
      setWorkingKey('')
    }
  }

  const saveService = async (service) => {
    const draft = serviceDrafts[service._id] || {
      status: service.status,
      adminRemarks: service.adminRemarks || '',
    }
    setWorkingKey(`service-${service._id}`)
    try {
      await api.patch(`/api/admin/services/${service._id}`, draft)
      await refreshAfterMutation('Service updated successfully.')
    } catch (error) {
      handleMutationError(error)
    } finally {
      setWorkingKey('')
    }
  }

  if (!user?._id) {
    return (
      <section className="admin-preview-inline">
        <EmptyState description="User preview is loading." title="Loading preview" />
      </section>
    )
  }

  return (
    <section aria-label={`${user.name} preview`} className="admin-preview-inline">
      <div className="admin-preview-summary-row">
        <div className="admin-preview-user-card">
          <UserAvatar alt={`${user.name} profile`} className="admin-preview-avatar" user={user} />
          <div className="admin-preview-user-copy">
            <strong>{user.name}</strong>
          </div>
          <div className="admin-preview-user-actions">
            <StatusBadge status={user.isBlocked ? 'rejected' : 'approved'} />
            <button
              className={`admin-grid-button ${user.isBlocked ? 'unblock' : 'block'}`}
              onClick={() => onToggleBlock?.(user)}
              type="button"
            >
              {user.isBlocked ? 'Unblock' : 'Block'}
            </button>
            <button className="admin-grid-button delete" onClick={() => onDeleteUser?.(user)} type="button">
              Delete
            </button>
            <button className="button button-ghost button-compact" onClick={onClose} type="button">
              Close
            </button>
          </div>
        </div>

        <div className="admin-preview-tab-list" role="tablist">
          {tabs.map((tab) => (
            <button
              aria-selected={activeTab === tab.id}
              className={`admin-preview-nav-item ${activeTab === tab.id ? 'active' : ''}`}
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              role="tab"
              type="button"
            >
              <span>{tab.label}</span>
              {tab.alertCount ? <span className="admin-preview-tab-dot" /> : null}
            </button>
          ))}
        </div>
      </div>

      <div className="admin-preview-body">
        {activeTab === 'profile' ? (
          <div className="admin-preview-section">
            <div className="admin-preview-metric-grid">
              <article className="admin-preview-metric">
                <span>Total Documents</span>
                <strong>{user.documents.length}</strong>
              </article>
              <article className="admin-preview-metric">
                <span>Active Services</span>
                <strong>{user.services.filter((service) => service.status !== 'completed').length}</strong>
              </article>
              <article className="admin-preview-metric">
                <span>Appointments</span>
                <strong>{user.appointments.length}</strong>
              </article>
              <article className="admin-preview-metric">
                <span>Paid Revenue</span>
                <strong>{formatCurrency(paidAmount)}</strong>
              </article>
            </div>

            <div className="admin-preview-profile-grid">
              <article className="admin-subpanel">
                <div className="admin-subpanel-head">
                  <h4>Profile Details</h4>
                  <span className="admin-muted-text">Joined {formatDate(user.createdAt)}</span>
                </div>
                <div className="admin-info-grid">
                  <div>
                    <span className="admin-muted-label">Email</span>
                    <strong>{user.email}</strong>
                  </div>
                  <div>
                    <span className="admin-muted-label">Phone</span>
                    <strong>{user.phone || 'Not provided'}</strong>
                  </div>
                  <div>
                    <span className="admin-muted-label">Company</span>
                    <strong>{user.companyName || 'Not added'}</strong>
                  </div>
                  <div>
                    <span className="admin-muted-label">Account</span>
                    <strong>{user.isBlocked ? 'Blocked' : 'Active'}</strong>
                  </div>
                </div>
              </article>

              <article className="admin-subpanel">
                <div className="admin-subpanel-head">
                  <h4>Recent Updates</h4>
                  <span className="admin-muted-text">{user.notifications.length} items</span>
                </div>
                {user.notifications.length ? (
                  <div className="admin-record-list compact">
                    {user.notifications.map((notification) => (
                      <div className="admin-timeline-item" key={notification._id}>
                        <div className="admin-timeline-copy">
                          <strong>{notification.title}</strong>
                          <p>{notification.message}</p>
                        </div>
                        <div className="admin-timeline-meta">
                          {!notification.read ? <span className="admin-notification-dot" /> : null}
                          <span>{formatDateTime(notification.createdAt)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    description="No admin notifications have been sent to this client yet."
                    title="No updates"
                  />
                )}
              </article>
            </div>
          </div>
        ) : null}

        {activeTab === 'services' ? (
          user.services.length ? (
            <div className="admin-record-list">
              {user.services.map((service) => {
                const draft = serviceDrafts[service._id] || {
                  status: service.status,
                  adminRemarks: service.adminRemarks || '',
                }

                return (
                  <article className="admin-record-card" key={service._id}>
                    <div className="admin-record-header">
                      <div>
                        <div className="admin-record-title-row">
                          <strong>{service.type}</strong>
                          {(service.status !== 'completed' || service.requestedByClient) && (
                            <span className="admin-notification-dot" />
                          )}
                        </div>
                        <p>{service.description || service.notes || 'No additional service note shared yet.'}</p>
                      </div>
                      <StatusBadge status={service.status} />
                    </div>

                    <div className="admin-meta-row">
                      <span>Priority: {service.priority}</span>
                      <span>Price: {formatCurrency(service.price || 0)}</span>
                      <span>Updated: {formatDateTime(service.updatedAt)}</span>
                    </div>

                    <div className="admin-inline-editor">
                      <label>
                        Status
                        <select
                          onChange={(event) =>
                            setServiceDrafts((current) => ({
                              ...current,
                              [service._id]: {
                                status: event.target.value,
                                adminRemarks: current[service._id]?.adminRemarks ?? service.adminRemarks ?? '',
                              },
                            }))
                          }
                          value={draft.status}
                        >
                          <option value="pending">Pending</option>
                          <option value="in progress">In Progress</option>
                          <option value="completed">Completed</option>
                        </select>
                      </label>
                      <label className="grow">
                        Admin note
                        <input
                          onChange={(event) =>
                            setServiceDrafts((current) => ({
                              ...current,
                              [service._id]: {
                                status: current[service._id]?.status || service.status,
                                adminRemarks: event.target.value,
                              },
                            }))
                          }
                          placeholder="Share service progress"
                          type="text"
                          value={draft.adminRemarks}
                        />
                      </label>
                      <button
                        className="button button-primary button-compact"
                        disabled={workingKey === `service-${service._id}`}
                        onClick={() => saveService(service)}
                        type="button"
                      >
                        {workingKey === `service-${service._id}` ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <EmptyState
              description="Assigned services will appear here after the CA team creates work items."
              title="No services yet"
            />
          )
        ) : null}

          {activeTab === 'payments' ? (
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
                          <img
                            alt={`${payment.invoiceNumber} proof`}
                            className="admin-proof-thumb"
                            src={payment.screenshotUrl}
                          />
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
                            <option value="pending">Pending</option>
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
          ) : null}

          {activeTab === 'appointments' ? (
            user.appointments.length ? (
              <div className="admin-record-list">
                {user.appointments.map((appointment) => {
                  const draft = appointmentDrafts[appointment._id] || {
                    status: appointment.status,
                    scheduledFor: toDateTimeLocalValue(appointment.scheduledFor),
                    adminNotes: appointment.adminNotes || '',
                  }

                  return (
                    <article className="admin-record-card" key={appointment._id}>
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

                      <div className="admin-inline-editor">
                        <label>
                          Date & time
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
                        <label>
                          Status
                          <select
                            onChange={(event) =>
                              setAppointmentDrafts((current) => ({
                                ...current,
                                [appointment._id]: {
                                  status: event.target.value,
                                  scheduledFor:
                                    current[appointment._id]?.scheduledFor ||
                                    toDateTimeLocalValue(appointment.scheduledFor),
                                  adminNotes: current[appointment._id]?.adminNotes ?? appointment.adminNotes ?? '',
                                },
                              }))
                            }
                            value={draft.status}
                          >
                            <option value="pending">Pending</option>
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

                      <button
                        className="button button-primary button-compact"
                        disabled={workingKey === `appointment-${appointment._id}`}
                        onClick={() => saveAppointment(appointment)}
                        type="button"
                      >
                        {workingKey === `appointment-${appointment._id}` ? 'Saving...' : 'Save Appointment'}
                      </button>
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
          ) : null}

          {activeTab === 'documents' ? (
            user.documents.length ? (
              <div className="admin-record-list">
                {user.documents.map((documentRecord) => {
                  const draft = documentDrafts[documentRecord._id] || {
                    status: documentRecord.status,
                    remarks: documentRecord.remarks || '',
                  }

                  return (
                    <article className="admin-record-card" key={documentRecord._id}>
                      <div className="admin-record-header">
                        <div>
                          <div className="admin-record-title-row">
                            <strong>{documentRecord.documentType || documentRecord.title}</strong>
                            {documentRecord.status === 'pending' ? <span className="admin-notification-dot" /> : null}
                          </div>
                          <p>{documentRecord.originalName || documentRecord.filename}</p>
                        </div>
                        <div className="admin-status-pair">
                          <span className="admin-file-chip">
                            {getFileExtension(documentRecord.originalName || documentRecord.filename)}
                          </span>
                          <StatusBadge status={documentRecord.status} />
                        </div>
                      </div>

                      <div className="admin-meta-row">
                        <span>Service: {documentRecord.serviceType}</span>
                        <span>Uploaded: {formatDateTime(documentRecord.createdAt)}</span>
                        <span>
                          {documentRecord.uploadedBy?.role === 'admin'
                            ? `Shared by ${documentRecord.uploadedBy.name}`
                            : 'Submitted by user'}
                        </span>
                      </div>

                      {documentRecord.notes ? (
                        <p className="admin-client-note">Client note: {documentRecord.notes}</p>
                      ) : null}

                      <div className="admin-inline-editor admin-inline-editor-wrap">
                        <label>
                          Status
                          <select
                            onChange={(event) =>
                              setDocumentDrafts((current) => ({
                                ...current,
                                [documentRecord._id]: {
                                  status: event.target.value,
                                  remarks: current[documentRecord._id]?.remarks ?? documentRecord.remarks ?? '',
                                },
                              }))
                            }
                            value={draft.status}
                          >
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </label>
                        <label className="grow">
                          Admin note
                          <input
                            onChange={(event) =>
                              setDocumentDrafts((current) => ({
                                ...current,
                                [documentRecord._id]: {
                                  status: current[documentRecord._id]?.status || documentRecord.status,
                                  remarks: event.target.value,
                                },
                              }))
                            }
                            placeholder="Add review note"
                            type="text"
                            value={draft.remarks}
                          />
                        </label>
                        <div className="admin-record-actions">
                          <button
                            className="button button-ghost button-compact"
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
                          <button
                            className="button button-primary button-compact"
                            disabled={workingKey === `document-${documentRecord._id}`}
                            onClick={() => saveDocumentReview(documentRecord)}
                            type="button"
                          >
                            {workingKey === `document-${documentRecord._id}` ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : (
              <EmptyState
                description="Uploaded client files will appear here once this user starts submitting documents."
                title="No documents yet"
              />
            )
          ) : null}
      </div>
    </section>
  )
}

export default AdminUserPreviewPanel
