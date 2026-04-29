import { useEffect, useMemo, useState } from 'react'
import PageHeader from '../../components/common/PageHeader.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import Loader from '../../components/common/Loader.jsx'
import api, { extractApiError } from '../../lib/api.js'
import { downloadFileFromApi } from '../../lib/downloads.js'
import { formatDate, formatDateTime } from '../../lib/formatters.js'

function groupDocumentsByDate(documents) {
  const groups = []
  const lookup = new Map()

  for (const document of documents) {
    const key = formatDate(document.createdAt)

    if (!lookup.has(key)) {
      const nextGroup = { label: key, documents: [] }
      lookup.set(key, nextGroup)
      groups.push(nextGroup)
    }

    lookup.get(key).documents.push(document)
  }

  return groups
}

function Documents() {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [downloadingId, setDownloadingId] = useState('')
  const [status, setStatus] = useState({ type: '', message: '' })

  const loadDocuments = async () => {
    const { data } = await api.get('/api/documents')
    setDocuments(data.documents)
  }

  useEffect(() => {
    loadDocuments()
      .catch((error) => {
        setStatus({ type: 'error', message: extractApiError(error) })
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const summary = useMemo(() => {
    const nextSummary = {
      total: documents.length,
      pending: 0,
      approved: 0,
      rejected: 0,
      sharedByAdmin: 0,
    }

    for (const document of documents) {
      if (document.status === 'pending') nextSummary.pending += 1
      if (document.status === 'approved') nextSummary.approved += 1
      if (document.status === 'rejected') nextSummary.rejected += 1
      if (document.uploadedBy?.role === 'admin') nextSummary.sharedByAdmin += 1
    }

    return nextSummary
  }, [documents])

  const historyGroups = useMemo(() => groupDocumentsByDate(documents), [documents])

  const handleDownload = async (document) => {
    setDownloadingId(document._id)

    try {
      await downloadFileFromApi(document.downloadUrl, document.originalName || document.filename)
    } catch (error) {
      setStatus({ type: 'error', message: extractApiError(error) })
    } finally {
      setDownloadingId('')
    }
  }

  if (loading) {
    return <Loader message="Loading documents..." />
  }

  return (
    <div className="page-stack">
      <PageHeader
        description="See every file you uploaded or received from admin, along with upload date, status, download links, and review remarks."
        eyebrow="My Documents"
        title="Document Center"
      />

      <section className="panel document-summary-panel">
        <h3>Document summary</h3>
        <div className="document-summary-grid">
          <div className="document-stat-tile">
            <strong>{summary.total}</strong>
            <span>Total files</span>
          </div>
          <div className="document-stat-tile">
            <strong>{summary.pending}</strong>
            <span>Pending review</span>
          </div>
          <div className="document-stat-tile">
            <strong>{summary.approved}</strong>
            <span>Approved</span>
          </div>
          <div className="document-stat-tile">
            <strong>{summary.rejected}</strong>
            <span>Rejected</span>
          </div>
          <div className="document-stat-tile">
            <strong>{summary.sharedByAdmin}</strong>
            <span>Shared by admin</span>
          </div>
        </div>
      </section>

      {status.message ? <p className={`form-message ${status.type}`}>{status.message}</p> : null}

      {historyGroups.length ? (
        historyGroups.map((group) => (
          <section className="panel document-history-group" key={group.label}>
            <div className="document-history-head">
              <div>
                <span className="eyebrow">History Group</span>
                <h3>{group.label}</h3>
              </div>
              <span className="list-meta">{group.documents.length} file(s)</span>
            </div>

            <div className="list-stack">
              {group.documents.map((document) => (
                <article className="document-record" key={document._id}>
                  <div className="list-item stretch">
                    <div className="document-record-copy">
                      <div className="document-record-title">
                        <strong>{document.originalName || document.filename}</strong>
                        <StatusBadge status={document.status} />
                      </div>
                      <p>{document.documentType || document.title}</p>
                    </div>

                    <div className="document-actions">
                      <button
                        className="button button-primary button-compact"
                        disabled={downloadingId === document._id}
                        onClick={() => handleDownload(document)}
                        type="button"
                      >
                        {downloadingId === document._id ? 'Downloading...' : 'Download'}
                      </button>
                      {document.fileUrl ? (
                        <a
                          className="button button-ghost button-compact"
                          href={document.fileUrl}
                          rel="noreferrer"
                          target="_blank"
                        >
                          Preview
                        </a>
                      ) : null}
                    </div>
                  </div>

                  <div className="detail-row document-meta-row">
                    <span>Upload date: {formatDateTime(document.createdAt)}</span>
                    <span>Service: {document.serviceType || 'General'}</span>
                    <span>
                      {document.uploadedBy?.role === 'admin'
                        ? `Shared by ${document.uploadedBy.name}`
                        : 'Submitted by you'}
                    </span>
                  </div>

                  <div className="detail-row document-meta-row">
                    <span>{document.reviewedAt ? `Reviewed ${formatDateTime(document.reviewedAt)}` : 'Not reviewed yet'}</span>
                    <span>{document.reviewedBy?.name ? `Reviewed by ${document.reviewedBy.name}` : 'Awaiting admin action'}</span>
                  </div>

                  {document.notes ? <p className="document-remarks muted">Your note: {document.notes}</p> : null}

                  {document.remarks ? (
                    <p className="document-remarks">Admin remarks: {document.remarks}</p>
                  ) : (
                    <p className="document-remarks muted">No review remarks added yet.</p>
                  )}
                </article>
              ))}
            </div>
          </section>
        ))
      ) : (
        <EmptyState description="Submitted files will appear here in date-wise history groups." title="No documents yet" />
      )}
    </div>
  )
}

export default Documents
