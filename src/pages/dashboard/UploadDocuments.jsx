import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
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
}

const activeServiceStatuses = ['pending', 'approved', 'in progress']

function getLatestMatchingDocument(documents = [], { requiredDocument = '', documentType = '', serviceType = '' }) {
  return (
    [...documents]
      .filter(
        (document) =>
          document.title === requiredDocument &&
          document.documentType === documentType &&
          document.serviceType === serviceType,
      )
      .sort((left, right) => new Date(right.updatedAt || right.createdAt) - new Date(left.updatedAt || left.createdAt))[0] ||
    null
  )
}

function UploadDocuments() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const selectedServiceId = searchParams.get('service') || ''
  const selectedDocumentType = searchParams.get('documentType') || ''
  const selectedService = getServiceSelectionById(selectedServiceId)
  const [documents, setDocuments] = useState([])
  const [services, setServices] = useState([])
  const [serviceCatalog, setServiceCatalog] = useState([])
  const [selectedFiles, setSelectedFiles] = useState({})
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [fileInputSeed, setFileInputSeed] = useState(0)
  const [status, setStatus] = useState({ type: '', message: '' })

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

  const activeServiceType = form.serviceType || activeDocumentGuide?.activeDocumentType || 'General'

  const loadData = useCallback(async () => {
    const [{ data: documentsData }, { data: catalogData }, { data: servicesData }] = await Promise.all([
      api.get('/api/documents'),
      api.get('/api/services/catalog'),
      api.get('/api/services'),
    ])

    setDocuments(documentsData.documents || [])
    setServiceCatalog(catalogData.services || [])
    setServices(servicesData.services || [])
  }, [])

  useEffect(() => {
    loadData()
      .catch((error) => {
        setStatus({ type: 'error', message: extractApiError(error) })
      })
      .finally(() => {
        setLoading(false)
      })
  }, [loadData])

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

  useEffect(() => {
    setSelectedFiles({})
    setFileInputSeed((current) => current + 1)
  }, [activeDocumentGuide?.activeDocumentType, activeServiceType])

  const checklistItems = useMemo(() => {
    if (!activeDocumentGuide) {
      return []
    }

    return activeDocumentGuide.requiredDocuments.map((requiredDocument) => {
      const existingDocument = getLatestMatchingDocument(documents, {
        requiredDocument,
        documentType: activeDocumentGuide.activeDocumentType,
        serviceType: activeServiceType,
      })
      const selectedFile = selectedFiles[requiredDocument] || null
      const hasValidUpload = Boolean(existingDocument && existingDocument.status !== 'rejected')
      const isReady = Boolean(selectedFile || hasValidUpload)

      return {
        requiredDocument,
        existingDocument,
        selectedFile,
        hasValidUpload,
        isReady,
        statusLabel: selectedFile
          ? 'Selected'
          : existingDocument?.status === 'rejected'
            ? 'Rejected'
            : hasValidUpload
              ? 'Uploaded'
              : 'Pending',
      }
    })
  }, [activeDocumentGuide, activeServiceType, documents, selectedFiles])

  const checklistSummary = useMemo(() => {
    return {
      total: checklistItems.length,
      ready: checklistItems.filter((item) => item.isReady).length,
      uploaded: checklistItems.filter((item) => item.hasValidUpload).length,
      missing: checklistItems.filter((item) => !item.isReady).length,
    }
  }, [checklistItems])

  const currentCatalogItem = useMemo(
    () => serviceCatalog.find((service) => service.name === activeServiceType) || null,
    [activeServiceType, serviceCatalog],
  )

  const currentActiveService = useMemo(
    () =>
      services.find(
        (service) => service.type === activeServiceType && activeServiceStatuses.includes(service.status),
      ) || null,
    [activeServiceType, services],
  )

  const handleChange = (event) => {
    const { name, value } = event.target

    setForm((current) => {
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

  const handleFileChange = (requiredDocument, file) => {
    setSelectedFiles((current) => {
      if (!file) {
        const nextFiles = { ...current }
        delete nextFiles[requiredDocument]
        return nextFiles
      }

      return {
        ...current,
        [requiredDocument]: file,
      }
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setStatus({ type: '', message: '' })

    const missingDocuments = checklistItems.filter((item) => !item.isReady)

    if (missingDocuments.length) {
      setStatus({
        type: 'error',
        message: `Please choose files for all required documents before continuing. Missing: ${missingDocuments
          .map((item) => item.requiredDocument)
          .join(', ')}`,
      })
      return
    }

    setSubmitting(true)

    try {
      const uploadsToSubmit = checklistItems.filter((item) => item.selectedFile)

      for (const [index, item] of uploadsToSubmit.entries()) {
        const payload = new FormData()
        payload.append('title', item.requiredDocument)
        payload.append('documentType', activeDocumentGuide?.activeDocumentType || form.documentType)
        payload.append('serviceType', activeServiceType)
        payload.append('notes', index === 0 ? form.notes : '')
        payload.append('file', item.selectedFile)

        await api.post('/api/documents/upload', payload, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })
      }

      let nextServiceId = currentActiveService?._id || ''

      if (!nextServiceId && currentCatalogItem?._id) {
        const { data } = await api.post('/api/services/request', {
          catalogServiceId: currentCatalogItem._id,
          notes: form.notes,
        })
        nextServiceId = data.service?._id || ''
      }

      const resetDocumentType = selectedService ? selectedService.defaultDocumentType : documentTypeOptions[0]
      const resetServiceType = selectedService ? resetDocumentType : serviceCatalog[0]?.name || 'General'

      setForm({
        documentType: resetDocumentType,
        serviceType: resetServiceType,
        notes: '',
      })
      setSelectedFiles({})
      setFileInputSeed((current) => current + 1)
      await loadData()

      navigate('/dashboard/payments', {
        state: nextServiceId
          ? {
              serviceId: nextServiceId,
            }
          : undefined,
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
            ? `${selectedService.description} Select every required file below, submit them together, and then continue to the payment page.`
            : 'Choose the service track, attach every required file, and submit the full checklist together before moving ahead.'
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
                  ? 'Select one file for each required document below. The checklist will tick automatically as you choose files.'
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
                <img alt={image.alt} key={image.alt} loading="lazy" src={image.src} style={image.style} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="card-grid two-up">
        <form className="panel form-panel multi-document-form" onSubmit={handleSubmit}>
          <h3>Upload required documents</h3>

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

          <div className="document-checklist-grid">
            {checklistItems.map((item, index) => (
              <article
                className={`document-checklist-row${item.isReady ? ' ready' : ''}${item.existingDocument?.status === 'rejected' ? ' rejected' : ''}`}
                key={`${form.documentType}-${item.requiredDocument}`}
              >
                <div className="document-checklist-head">
                  <label className="document-checklist-checkbox">
                    <input checked={item.isReady} readOnly type="checkbox" />
                    <span>{item.requiredDocument}</span>
                  </label>
                  <span
                    className={`document-checklist-status ${
                      item.selectedFile
                        ? 'selected'
                        : item.existingDocument?.status === 'rejected'
                          ? 'rejected'
                          : item.hasValidUpload
                            ? 'uploaded'
                            : 'pending'
                    }`}
                  >
                    {item.statusLabel}
                  </span>
                </div>

                <div className="document-checklist-copy">
                  <small>
                    {item.selectedFile
                      ? item.selectedFile.name
                      : item.existingDocument?.originalName || 'No file selected yet'}
                  </small>
                  {item.existingDocument?.status === 'rejected' && !item.selectedFile ? (
                    <small>Previous upload was rejected. Please choose a corrected file.</small>
                  ) : null}
                </div>

                <input
                  accept=".pdf,image/*"
                  key={`${fileInputSeed}-${index}-${item.requiredDocument}`}
                  onChange={(event) => handleFileChange(item.requiredDocument, event.target.files?.[0] || null)}
                  type="file"
                />
              </article>
            ))}
          </div>

          {status.message ? <p className={`form-message ${status.type}`}>{status.message}</p> : null}

          <button className="button button-primary" disabled={submitting} type="submit">
            {submitting ? 'Submitting documents...' : 'Submit All Documents & Continue'}
          </button>
        </form>

        <article className="panel document-summary-panel">
          <h3>Checklist progress</h3>
          <div className="document-summary-grid">
            <div className="document-stat-tile">
              <strong>{checklistSummary.total}</strong>
              <span>Total required</span>
            </div>
            <div className="document-stat-tile">
              <strong>{checklistSummary.ready}</strong>
              <span>Ready to submit</span>
            </div>
            <div className="document-stat-tile">
              <strong>{checklistSummary.uploaded}</strong>
              <span>Already uploaded</span>
            </div>
            <div className="document-stat-tile">
              <strong>{checklistSummary.missing}</strong>
              <span>Still missing</span>
            </div>
          </div>

          <ul className="bullet-list">
            <li>Each required document now has its own upload field.</li>
            <li>Checkbox automatically tick ho jayega when a file is selected or already uploaded.</li>
            <li>Single file choose karte hi auto-submit nahi hoga. Final submit ek hi baar se hoga.</li>
            <li>Successful submit ke baad payment page automatically open ho jayega.</li>
          </ul>
        </article>
      </section>
    </div>
  )
}

export default UploadDocuments
