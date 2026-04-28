import { useEffect, useState } from 'react'
import PageHeader from '../../components/common/PageHeader.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import Loader from '../../components/common/Loader.jsx'
import api, { extractApiError } from '../../lib/api.js'
import { formatDate } from '../../lib/formatters.js'

const initialForm = {
  title: '',
  serviceType: 'Income Tax Filing',
  userId: '',
  file: null,
}

function Documents() {
  const [documents, setDocuments] = useState([])
  const [users, setUsers] = useState([])
  const [form, setForm] = useState(initialForm)
  const [review, setReview] = useState({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState({ type: '', message: '' })

  const loadPageData = async () => {
    const [{ data: documentsData }, { data: usersData }] = await Promise.all([
      api.get('/api/admin/documents'),
      api.get('/api/admin/users'),
    ])

    const clientUsers = usersData.users.filter((user) => user.role !== 'admin')
    setDocuments(documentsData.documents)
    setUsers(clientUsers)
    setForm((current) => ({
      ...current,
      userId: current.userId || clientUsers[0]?._id || '',
    }))
  }

  useEffect(() => {
    loadPageData()
      .catch((error) => {
        setStatus({ type: 'error', message: extractApiError(error) })
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const handleChange = (event) => {
    const { name, value, files } = event.target

    setForm((current) => ({
      ...current,
      [name]: files ? files[0] : value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setStatus({ type: '', message: '' })

    const payload = new FormData()
    payload.append('title', form.title)
    payload.append('serviceType', form.serviceType)
    payload.append('userId', form.userId)
    payload.append('file', form.file)

    try {
      await api.post('/api/admin/documents/upload', payload, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      setForm({
        ...initialForm,
        userId: users[0]?._id || '',
        file: null,
      })
      await loadPageData()
      setStatus({ type: 'success', message: 'Document shared with user successfully.' })
    } catch (error) {
      setStatus({ type: 'error', message: extractApiError(error) })
    } finally {
      setSubmitting(false)
    }
  }

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
      await loadPageData()
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
        description="Review uploaded files, approve or reject them, and share documents directly with clients."
        eyebrow="Admin"
        title="Document Review"
      />

      {status.message ? <p className={`form-message ${status.type}`}>{status.message}</p> : null}

      <section className="card-grid two-up">
        <form className="panel form-panel" onSubmit={handleSubmit}>
          <h3>Send document to a user</h3>
          <label>
            Select user
            <select name="userId" onChange={handleChange} required value={form.userId}>
              {users.map((user) => (
                <option key={user._id} value={user._id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
          </label>
          <label>
            Document title
            <input name="title" onChange={handleChange} required type="text" value={form.title} />
          </label>
          <label>
            Service type
            <select name="serviceType" onChange={handleChange} value={form.serviceType}>
              <option>Income Tax Filing</option>
              <option>GST Registration & Return</option>
              <option>Audit Services</option>
              <option>Company Registration</option>
              <option>Accounting / Bookkeeping</option>
            </select>
          </label>
          <label>
            File
            <input accept=".pdf,image/*" name="file" onChange={handleChange} required type="file" />
          </label>

          <button className="button button-primary" disabled={submitting || !users.length} type="submit">
            {submitting ? 'Sharing...' : 'Share Document'}
          </button>
        </form>

        <article className="panel">
          <h3>Shared visibility</h3>
          <p>Client uploads come here for review, and documents shared from this panel appear in that user's dashboard.</p>
          <ul className="bullet-list">
            <li>User uploads are visible in admin review automatically.</li>
            <li>Admin-shared documents are visible to the selected user.</li>
            <li>Review status and remarks stay synced on both sides.</li>
          </ul>
        </article>
      </section>

      {documents.length ? (
        <div className="list-stack">
          {documents.map((document) => {
            const currentReview = review[document._id] || { status: document.status, remarks: document.remarks || '' }
            const senderName = document.uploadedBy?.name || document.user?.name || 'Unknown'

            return (
              <article className="panel" key={document._id}>
                <div className="list-item stretch">
                  <div>
                    <strong>{document.title}</strong>
                    <p>
                      For {document.user?.name || 'Unknown user'} | {document.serviceType}
                    </p>
                    <small>
                      Sent by {senderName} | Uploaded {formatDate(document.createdAt)}
                    </small>
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
        <EmptyState description="Client uploads and shared documents will appear here." title="No documents to review" />
      )}
    </div>
  )
}

export default Documents
