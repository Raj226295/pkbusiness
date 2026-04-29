import { useEffect, useMemo, useState } from 'react'
import PageHeader from '../../components/common/PageHeader.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import Loader from '../../components/common/Loader.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import UserAvatar from '../../components/common/UserAvatar.jsx'
import api, { extractApiError } from '../../lib/api.js'
import { downloadFileFromApi } from '../../lib/downloads.js'
import { formatCurrency, formatDateTime } from '../../lib/formatters.js'

const coreServices = [
  'Income Tax Filing',
  'GST Registration & Return',
  'Audit Services',
  'Accounting / Bookkeeping',
  'Company Registration',
  'Food License',
]

function Services() {
  const [documents, setDocuments] = useState([])
  const [services, setServices] = useState([])
  const [catalog, setCatalog] = useState([])
  const [users, setUsers] = useState([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedServiceName, setSelectedServiceName] = useState(coreServices[0])
  const [documentDrafts, setDocumentDrafts] = useState({})
  const [savingKey, setSavingKey] = useState('')
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState({ type: '', message: '' })

  const loadData = async () => {
    const [{ data: servicesData }, { data: documentsData }, { data: usersData }] = await Promise.all([
      api.get('/api/admin/services'),
      api.get('/api/admin/documents'),
      api.get('/api/admin/users'),
    ])

    const clientUsers = (usersData.users || []).filter((user) => user.role !== 'admin')
    setServices(servicesData.services || [])
    setCatalog(servicesData.catalog || [])
    setDocuments(documentsData.documents || [])
    setUsers(clientUsers)
    setSelectedUserId((current) => (clientUsers.some((user) => user._id === current) ? current : clientUsers[0]?._id || ''))
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

  const serviceNames = useMemo(() => {
    const names = new Set(coreServices)
    catalog.forEach((item) => names.add(item.name))
    return Array.from(names)
  }, [catalog])

  const selectedUser = useMemo(
    () => users.find((user) => user._id === selectedUserId) || users[0] || null,
    [selectedUserId, users],
  )

  const serviceCards = useMemo(() => {
    return serviceNames.map((serviceName) => {
      const serviceDocuments = documents.filter(
        (document) => document.user?._id === selectedUser?._id && document.serviceType === serviceName,
      )
      const assignment = services.find(
        (service) => service.user?._id === selectedUser?._id && service.type === serviceName,
      )

      return {
        serviceName,
        documents: serviceDocuments,
        assignment,
        latestUpload: serviceDocuments[0]?.createdAt || '',
      }
    })
  }, [documents, selectedUser?._id, serviceNames, services])

  const activeService = useMemo(
    () => serviceCards.find((service) => service.serviceName === selectedServiceName) || serviceCards[0] || null,
    [selectedServiceName, serviceCards],
  )

  const saveDocumentReview = async (documentRecord) => {
    const draft = documentDrafts[documentRecord._id] || {
      status: documentRecord.status,
      remarks: documentRecord.remarks || '',
    }

    setSavingKey(documentRecord._id)

    try {
      await api.patch(`/api/admin/documents/${documentRecord._id}`, draft)
      await loadData()
      setStatus({ type: 'success', message: 'Service document updated successfully.' })
    } catch (error) {
      setStatus({ type: 'error', message: extractApiError(error) })
    } finally {
      setSavingKey('')
    }
  }

  if (loading) {
    return <Loader message="Loading service workspace..." />
  }

  return (
    <div className="page-stack">
      <PageHeader
        description="Review each CA service by client, spot new submissions with red-dot alerts, and approve or reject uploaded documents."
        eyebrow="Services"
        title="Service Review Desk"
      />

      {status.message ? <p className={`form-message ${status.type}`}>{status.message}</p> : null}

      <section className="admin-client-strip">
        {users.map((user) => (
          <button
            className={`admin-client-pill ${selectedUser?._id === user._id ? 'active' : ''}`}
            key={user._id}
            onClick={() => setSelectedUserId(user._id)}
            type="button"
          >
            <UserAvatar alt={`${user.name} profile`} className="admin-folder-avatar" user={user} />
            <div>
              <strong>{user.name}</strong>
              <span>{user.email}</span>
            </div>
          </button>
        ))}
      </section>

      <section className="admin-service-card-grid">
        {serviceCards.map((service) => (
          <button
            className={`admin-service-card ${activeService?.serviceName === service.serviceName ? 'active' : ''}`}
            key={service.serviceName}
            onClick={() => setSelectedServiceName(service.serviceName)}
            type="button"
          >
            <div className="admin-service-card-head">
              <strong>{service.serviceName}</strong>
              {service.documents.length ? <span className="admin-notification-dot" /> : null}
            </div>
            <p>{service.assignment?.description || 'Professional CA support and document handling.'}</p>
            <div className="admin-service-card-meta">
              <span>{service.documents.length} files</span>
              <span>{service.latestUpload ? formatDateTime(service.latestUpload) : 'No upload yet'}</span>
            </div>
          </button>
        ))}
      </section>

      <section className="panel admin-service-detail">
        {selectedUser && activeService ? (
          <>
            <div className="admin-folder-detail-head">
              <div>
                <span className="admin-surface-eyebrow">Selected Service</span>
                <h3>
                  {activeService.serviceName} for {selectedUser.name}
                </h3>
                <p>{selectedUser.email}</p>
              </div>

              {activeService.assignment ? (
                <div className="admin-service-summary">
                  <StatusBadge status={activeService.assignment.status} />
                  <span>{formatCurrency(activeService.assignment.price || 0)}</span>
                </div>
              ) : (
                <div className="admin-service-summary muted">No service assignment record yet</div>
              )}
            </div>

            {activeService.assignment?.notes ? (
              <p className="admin-client-note">Client note: {activeService.assignment.notes}</p>
            ) : null}

            {activeService.documents.length ? (
              <div className="admin-folder-file-list">
                {activeService.documents.map((documentRecord) => {
                  const draft = documentDrafts[documentRecord._id] || {
                    status: documentRecord.status,
                    remarks: documentRecord.remarks || '',
                  }

                  return (
                    <article className="admin-folder-file-row admin-folder-file-row-rich" key={documentRecord._id}>
                      <div>
                        <div className="admin-record-title-row">
                          <strong>{documentRecord.documentType || documentRecord.title}</strong>
                          <StatusBadge status={documentRecord.status} />
                        </div>
                        <p>{documentRecord.originalName || documentRecord.filename}</p>
                        <div className="admin-meta-row">
                          <span>Uploaded: {formatDateTime(documentRecord.createdAt)}</span>
                          <span>{documentRecord.uploadedBy?.role === 'admin' ? 'Shared by admin' : 'Submitted by user'}</span>
                        </div>
                      </div>

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
                            placeholder="Add verification remark"
                            type="text"
                            value={draft.remarks}
                          />
                        </label>
                        <div className="admin-record-actions">
                          <button
                            className="button button-primary button-compact"
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
                            <a className="button button-ghost button-compact" href={documentRecord.fileUrl} rel="noreferrer" target="_blank">
                              Preview
                            </a>
                          ) : null}
                          <button
                            className="button button-ghost button-compact"
                            disabled={savingKey === documentRecord._id}
                            onClick={() => saveDocumentReview(documentRecord)}
                            type="button"
                          >
                            {savingKey === documentRecord._id ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : (
              <EmptyState
                description="No PDF or DOC files have been submitted for this service yet."
                title="No service documents"
              />
            )}
          </>
        ) : (
          <EmptyState description="Choose a client to start reviewing service-wise documents." title="No client selected" />
        )}
      </section>
    </div>
  )
}

export default Services
