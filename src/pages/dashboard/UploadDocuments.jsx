import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import PageHeader from '../../components/common/PageHeader.jsx'
import Loader from '../../components/common/Loader.jsx'
import {
  documentTypeOptions,
  getServiceSelectionByDocumentType,
  getServiceSelectionById,
} from '../../data/serviceSelectionFlow.js'
import api, { extractApiError } from '../../lib/api.js'

const initialForm = {
  documentType: documentTypeOptions[0],
  serviceType: '',
  notes: '',
  file: null,
}

function UploadDocuments() {
  const [searchParams] = useSearchParams()
  const selectedServiceId = searchParams.get('service') || ''
  const selectedDocumentType = searchParams.get('documentType') || ''
  const selectedService = getServiceSelectionById(selectedServiceId)
  const [documents, setDocuments] = useState([])
  const [serviceCatalog, setServiceCatalog] = useState([])
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [fileInputKey, setFileInputKey] = useState(0)
  const [status, setStatus] = useState({ type: '', message: '' })

  const summary = useMemo(() => {
    return {
      total: documents.length,
      pending: documents.filter((document) => document.status === 'pending').length,
      approved: documents.filter((document) => document.status === 'approved').length,
    }
  }, [documents])

  const activeDocumentGuide = useMemo(() => {
    const guide = selectedService || getServiceSelectionByDocumentType(form.documentType)

    if (!guide) {
      return null
    }

    const activeDocumentType = guide.documentTypes.includes(form.documentType)
      ? form.documentType
      : guide.defaultDocumentType

    return {
      ...guide,
      activeDocumentType,
      requiredDocuments: guide.requiredDocumentsByType[activeDocumentType] || [],
    }
  }, [form.documentType, selectedService])

  const loadData = async () => {
    const [{ data: documentsData }, { data: catalogData }] = await Promise.all([
      api.get('/api/documents'),
      api.get('/api/services/catalog'),
    ])

    setDocuments(documentsData.documents)
    setServiceCatalog(catalogData.services || [])
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

  useEffect(() => {
    const fallbackServiceType = serviceCatalog[0]?.name || 'General'

    setForm((current) => {
      const preferredDocumentType =
        selectedService && selectedService.documentTypes.includes(selectedDocumentType)
          ? selectedDocumentType
          : ''

      const nextDocumentType = selectedService
        ? preferredDocumentType || (selectedService.documentTypes.includes(current.documentType)
            ? current.documentType
            : selectedService.defaultDocumentType)
        : selectedDocumentType || current.documentType || documentTypeOptions[0]

      const nextServiceType = selectedService ? nextDocumentType : current.serviceType || fallbackServiceType

      if (current.documentType === nextDocumentType && current.serviceType === nextServiceType) {
        return current
      }

      return {
        ...current,
        documentType: nextDocumentType,
        serviceType: nextServiceType,
      }
    })
  }, [selectedDocumentType, selectedService, serviceCatalog])

  const handleChange = (event) => {
    const { name, value, files } = event.target

    setForm((current) => {
      if (files) {
        return {
          ...current,
          [name]: files[0],
        }
      }

      const nextForm = {
        ...current,
        [name]: value,
      }

      if (selectedService && name === 'documentType') {
        nextForm.serviceType = value
      }

      return nextForm
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setStatus({ type: '', message: '' })

    const payload = new FormData()
    payload.append('title', form.documentType)
    payload.append('documentType', form.documentType)
    payload.append('serviceType', form.serviceType || form.documentType || 'General')
    payload.append('notes', form.notes)
    payload.append('file', form.file)

    try {
      await api.post('/api/documents/upload', payload, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      const resetDocumentType = selectedService ? selectedService.defaultDocumentType : documentTypeOptions[0]
      const resetServiceType = selectedService ? resetDocumentType : serviceCatalog[0]?.name || 'General'

      setForm({
        documentType: resetDocumentType,
        serviceType: resetServiceType,
        notes: '',
        file: null,
      })
      setFileInputKey((current) => current + 1)
      await loadData()
      setStatus({
        type: 'success',
        message: 'Document submitted successfully. Status is now pending and the admin has been notified.',
      })
    } catch (error) {
      setStatus({ type: 'error', message: extractApiError(error) })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <Loader message="Loading upload form..." />
  }

  return (
    <div className="page-stack">
      <PageHeader
        description={
          selectedService
            ? selectedService.description
            : 'Select the document type, attach your file, add an optional message, and send it directly for admin review.'
        }
        eyebrow="Upload Documents"
        title={selectedService ? selectedService.name : 'Submit Client Documents'}
      />

      {activeDocumentGuide ? (
        <section className="panel guided-upload-panel">
          <div className="guided-upload-layout">
            <div className="guided-upload-copy">
              <span className="eyebrow">{selectedService ? 'Selected Service' : 'Document Checklist'}</span>
              <h3>{activeDocumentGuide.name}</h3>
              <p>
                {selectedService
                  ? 'Review the required checklist below, then upload the matching document from the form.'
                  : `The checklist below updates with the current document type: ${activeDocumentGuide.activeDocumentType}.`}
              </p>
              <div className="guided-upload-chip-row">
                <span className="service-doc-chip">{activeDocumentGuide.activeDocumentType}</span>
              </div>
              <div className="guided-document-group">
                <strong>Required documents</strong>
                <ul className="guided-document-list">
                  {activeDocumentGuide.requiredDocuments.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className={`guided-upload-media ${activeDocumentGuide.cardImages.length > 1 ? 'dual' : ''}`}>
              {activeDocumentGuide.cardImages.map((image) => (
                <img alt={image.alt} key={image.alt} loading="lazy" src={image.src} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="card-grid two-up">
        <form className="panel form-panel" onSubmit={handleSubmit}>
          <h3>Upload file</h3>

          <label>
            {selectedService && selectedService.documentTypes.length > 1 ? 'Choose document track' : 'Document type'}
            <select name="documentType" onChange={handleChange} value={form.documentType}>
              {(selectedService ? selectedService.documentTypes : documentTypeOptions).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label>
            Related service
            {selectedService ? (
              <input readOnly type="text" value={form.serviceType || form.documentType} />
            ) : (
              <select name="serviceType" onChange={handleChange} value={form.serviceType}>
                {serviceCatalog.map((service) => (
                  <option key={service._id} value={service.name}>
                    {service.name}
                  </option>
                ))}
                {!serviceCatalog.length ? <option value="General">General</option> : null}
              </select>
            )}
          </label>

          <label>
            Notes / message
            <textarea
              name="notes"
              onChange={handleChange}
              placeholder="Optional message for admin"
              rows="4"
              value={form.notes}
            />
          </label>

          <label>
            File
            <input
              accept=".pdf,image/*"
              key={fileInputKey}
              name="file"
              onChange={handleChange}
              required
              type="file"
            />
          </label>

          {status.message ? <p className={`form-message ${status.type}`}>{status.message}</p> : null}

          <button className="button button-primary" disabled={submitting} type="submit">
            {submitting ? 'Submitting...' : 'Submit Document'}
          </button>
        </form>

        <article className="panel document-summary-panel">
          <h3>Upload status</h3>
          <div className="document-summary-grid">
            <div className="document-stat-tile">
              <strong>{summary.total}</strong>
              <span>Total uploads</span>
            </div>
            <div className="document-stat-tile">
              <strong>{summary.pending}</strong>
              <span>Pending review</span>
            </div>
            <div className="document-stat-tile">
              <strong>{summary.approved}</strong>
              <span>Approved</span>
            </div>
          </div>
          <ul className="bullet-list">
            <li>Accepted formats: PDF, JPG, PNG.</li>
            <li>Every new upload is marked as pending until reviewed by admin.</li>
            <li>If the file is unclear, the admin can reject it with remarks for re-upload.</li>
          </ul>
        </article>
      </section>
    </div>
  )
}

export default UploadDocuments
