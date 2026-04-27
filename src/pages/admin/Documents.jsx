import { useEffect, useState } from 'react'
import PageHeader from '../../components/common/PageHeader.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import Loader from '../../components/common/Loader.jsx'
import api, { extractApiError } from '../../lib/api.js'

function Documents() {
  const [documents, setDocuments] = useState([])
  const [review, setReview] = useState({})
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState({ type: '', message: '' })

  const loadDocuments = async () => {
    const { data } = await api.get('/api/admin/documents')
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

  const updateReviewField = (documentId, field, value) => {
    setReview((current) => ({
      ...current,
      [documentId]: {
        status: current[documentId]?.status || 'verified',
        remarks: current[documentId]?.remarks || '',
        [field]: value,
      },
    }))
  }

  const submitReview = async (documentId) => {
    const payload = review[documentId] || { status: 'verified', remarks: '' }

    try {
      await api.patch(`/api/admin/documents/${documentId}`, payload)
      await loadDocuments()
      setStatus({ type: 'success', message: 'Document updated successfully.' })
    } catch (error) {
      setStatus({ type: 'error', message: extractApiError(error) })
    }
  }

  if (loading) {
    return <Loader message="Loading uploaded files..." />
  }

  return (
    <div className="page-stack">
      <PageHeader
        description="Review uploaded files, approve or reject them, and leave remarks for the client."
        eyebrow="Admin"
        title="Document Review"
      />

      {status.message ? <p className={`form-message ${status.type}`}>{status.message}</p> : null}

      {documents.length ? (
        <div className="list-stack">
          {documents.map((document) => {
            const currentReview = review[document._id] || { status: document.status, remarks: document.remarks || '' }

            return (
              <article className="panel" key={document._id}>
                <div className="list-item stretch">
                  <div>
                    <strong>{document.title}</strong>
                    <p>
                      {document.user?.name || 'Unknown user'} | {document.serviceType}
                    </p>
                    {document.fileUrl ? (
                      <a className="text-link" href={document.fileUrl} rel="noreferrer" target="_blank">
                        Open attachment
                      </a>
                    ) : null}
                  </div>
                  <StatusBadge status={document.status} />
                </div>

                <div className="inline-form">
                  <select
                    onChange={(event) => updateReviewField(document._id, 'status', event.target.value)}
                    value={currentReview.status}
                  >
                    <option value="pending">Pending</option>
                    <option value="verified">Verified</option>
                    <option value="rejected">Rejected</option>
                  </select>
                  <input
                    onChange={(event) => updateReviewField(document._id, 'remarks', event.target.value)}
                    placeholder="Add remarks"
                    type="text"
                    value={currentReview.remarks}
                  />
                  <button className="button button-primary" onClick={() => submitReview(document._id)} type="button">
                    Save
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <EmptyState description="Client uploads will appear here for review." title="No documents to review" />
      )}
    </div>
  )
}

export default Documents
