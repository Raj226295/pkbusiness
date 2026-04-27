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
  file: null,
}

function Documents() {
  const [documents, setDocuments] = useState([])
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
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
    payload.append('file', form.file)

    try {
      await api.post('/api/documents/upload', payload, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      setForm(initialForm)
      await loadDocuments()
      setStatus({ type: 'success', message: 'Document uploaded successfully.' })
    } catch (error) {
      setStatus({ type: 'error', message: extractApiError(error) })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <Loader message="Loading documents..." />
  }

  return (
    <div className="page-stack">
      <PageHeader
        description="Upload PDFs or images for review and track the verification status."
        eyebrow="Documents"
        title="Secure File Vault"
      />

      <section className="card-grid two-up">
        <form className="panel form-panel" onSubmit={handleSubmit}>
          <h3>Upload a document</h3>
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

          {status.message ? <p className={`form-message ${status.type}`}>{status.message}</p> : null}

          <button className="button button-primary" disabled={submitting} type="submit">
            {submitting ? 'Uploading...' : 'Upload Document'}
          </button>
        </form>

        <article className="panel">
          <h3>Uploaded files</h3>
          {documents.length ? (
            <div className="list-stack">
              {documents.map((document) => (
                <div className="list-item stretch" key={document._id}>
                  <div>
                    <strong>{document.title}</strong>
                    <p>
                      {document.serviceType} | Uploaded {formatDate(document.createdAt)}
                    </p>
                    {document.remarks ? <small>Remarks: {document.remarks}</small> : null}
                    {document.fileUrl ? (
                      <a className="text-link" href={document.fileUrl} rel="noreferrer" target="_blank">
                        View file
                      </a>
                    ) : null}
                  </div>
                  <StatusBadge status={document.status} />
                </div>
              ))}
            </div>
          ) : (
            <EmptyState description="Uploaded files will show here after submission." title="No documents yet" />
          )}
        </article>
      </section>
    </div>
  )
}

export default Documents
