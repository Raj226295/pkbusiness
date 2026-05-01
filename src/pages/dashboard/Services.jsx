import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../../components/common/PageHeader.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import Loader from '../../components/common/Loader.jsx'
import { getServiceSelectionByDocumentType } from '../../data/serviceSelectionFlow.js'
import api, { extractApiError } from '../../lib/api.js'
import { formatCurrency, formatDate } from '../../lib/formatters.js'
import { getServicePaymentEligibility } from '../../lib/paymentEligibility.js'
import { resolveUploadUrl } from '../../lib/uploads.js'

const visibleServiceStatuses = ['pending', 'approved', 'rejected', 'in progress', 'completed']

function getServiceStageTitle(state) {
  switch (state.stage) {
    case 'service_completed':
      return 'Service completed'
    case 'service_rejected':
      return 'Service rejected'
    case 'service_in_progress':
      return 'Work in progress'
    case 'approved':
      return 'Payment approved'
    case 'under_review':
      return 'Payment under review'
    case 'ready':
      return 'Approved for payment'
    case 'retry':
      return 'Retry payment'
    case 'awaiting_price':
      return 'Waiting for price'
    case 'review_pending':
      return 'Documents under review'
    case 'reupload_required':
      return 'Re-upload required'
    case 'service_pending_approval':
      return 'Waiting for admin approval'
    default:
      return 'Upload documents'
  }
}

function getPaymentHint(service, state) {
  switch (state.stage) {
    case 'service_completed':
      return service.adminRemarks || 'Admin has marked this service as completed.'
    case 'service_rejected':
      return service.adminRemarks || 'Admin has rejected this service. Please review the note and upload corrected documents if needed.'
    case 'service_in_progress':
      return 'Payment is verified and the admin team is now working on this service.'
    case 'service_pending_approval':
      return 'Admin will first approve this service, then payment will open after document review and price update.'
    case 'ready':
      return 'Admin approved this service, reviewed the documents, and set the final price. Payment is ready now.'
    case 'retry':
      return state.latestPayment?.reviewRemarks
        ? `Payment rejected: ${state.latestPayment.reviewRemarks}`
        : 'Previous payment was rejected. Please submit payment again.'
    case 'under_review':
      return 'Payment request submitted. Admin is verifying screenshot and transaction ID.'
    case 'approved':
      return 'Payment approved successfully.'
    case 'awaiting_price':
      return 'Admin is yet to set the final service price.'
    case 'review_pending':
      return 'Documents are still under admin review.'
    case 'reupload_required':
      return 'Some documents were rejected. Please upload the corrected files.'
    default:
      return 'Upload documents to move this service ahead.'
  }
}

function Services() {
  const [services, setServices] = useState([])
  const [catalog, setCatalog] = useState([])
  const [documents, setDocuments] = useState([])
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const selectedServices = useMemo(
    () => services.filter((service) => visibleServiceStatuses.includes(service.status)),
    [services],
  )

  const availableServices = useMemo(() => {
    return catalog.map((service) => {
      const guide = getServiceSelectionByDocumentType(service.name)
      const imageIndex = guide ? Math.max(guide.documentTypes.indexOf(service.name), 0) : -1
      const guideImage = guide ? guide.cardImages[imageIndex] || guide.cardImages[0] : null

      return {
        ...service,
        guide,
        cardImageUrl: service.image
          ? resolveUploadUrl(service.image)
          : guideImage?.src || '',
        cardImageAlt: guideImage?.alt || `${service.name} poster`,
        cardImageStyle: service.image
          ? {
              objectPosition: `${50 + Number(service.imageOffsetX || 0)}% ${50 + Number(service.imageOffsetY || 0)}%`,
              transform: `scale(${Number(service.imageZoom || 1)})`,
            }
          : guideImage?.style,
      }
    })
  }, [catalog])

  const selectedServiceStates = useMemo(
    () =>
      selectedServices.map((service) => ({
        service,
        paymentState: getServicePaymentEligibility({
          service,
          documents,
          payments,
        }),
      })),
    [documents, payments, selectedServices],
  )

  const loadData = async () => {
    const [servicesRes, catalogRes, documentsRes, paymentsRes] = await Promise.all([
      api.get('/api/services'),
      api.get('/api/services/catalog'),
      api.get('/api/documents'),
      api.get('/api/payments'),
    ])
    setServices(servicesRes.data.services)
    setCatalog(catalogRes.data.services)
    setDocuments(documentsRes.data.documents || [])
    setPayments(paymentsRes.data.payments || [])
  }

  useEffect(() => {
    loadData()
      .catch((err) => {
        setError(extractApiError(err))
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const buildUploadDocumentsUrl = (serviceName) => {
    const guide = getServiceSelectionByDocumentType(serviceName)

    if (!guide) {
      return '/dashboard/upload-documents'
    }

    const query = new URLSearchParams({
      service: guide.id,
      documentType: serviceName,
    })

    return `/dashboard/upload-documents?${query.toString()}`
  }

  const handleOpenUploadDocuments = (serviceName) => {
    navigate(buildUploadDocumentsUrl(serviceName))
  }

  const handleOpenUploadDocumentsInNewPage = (serviceName) => {
    window.open(buildUploadDocumentsUrl(serviceName), '_blank', 'noopener,noreferrer')
  }

  const handleProceedToPayment = (service) => {
    navigate('/dashboard/payments', {
      state: {
        serviceId: service._id,
      },
    })
  }

  if (loading) {
    return <Loader message="Loading services..." />
  }

  return (
    <div className="page-stack">
      <PageHeader
        description="Browse available CA services, view the service artwork, and open the upload page directly for the service you want."
        eyebrow="Services"
        title="Select CA Services"
      />

      {error ? <p className="form-message error">{error}</p> : null}

      <section className="panel dashboard-services-section">
        <div className="document-history-head">
          <div>
            <span className="eyebrow">Available Services</span>
            <h3>Choose a service and upload documents</h3>
            <p>Select any service card to move directly to the upload document page for that service.</p>
          </div>
        </div>

        {availableServices.length ? (
          <div className="dashboard-services-grid">
            {availableServices.map((service) => (
              <button
                className="service-selection-card"
                key={service._id}
                onClick={() => handleOpenUploadDocumentsInNewPage(service.name)}
                type="button"
              >
                {service.cardImageUrl ? (
                  <div className="service-card-media">
                    <img alt={service.cardImageAlt} loading="lazy" src={service.cardImageUrl} style={service.cardImageStyle} />
                  </div>
                ) : null}
                <div className="service-card-body">
                  <div className="service-card-topline">
                    <strong>{service.name}</strong>
                    <span className="status-badge neutral service-card-price">{formatCurrency(service.price || 0)}</span>
                  </div>
                  <p>{service.description || service.guide?.summary || 'Professional support for this service.'}</p>
                  <span className="service-card-link">Upload documents</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState description="The service catalog will appear here once the admin publishes it." title="No services available" />
        )}
      </section>

      <section className="panel">
        <div className="document-history-head">
          <div>
            <span className="eyebrow">My Services</span>
            <h3>Selected and assigned services</h3>
          </div>
        </div>

        {selectedServiceStates.length ? (
          <div className="card-grid two-up">
            {selectedServiceStates.map(({ service, paymentState }) => (
              <article className="panel" key={service._id}>
                <div className="list-item">
                  <strong>{service.type}</strong>
                  <div className="list-meta-group">
                    <StatusBadge status={service.status} />
                    {paymentState.latestPayment ? (
                      <StatusBadge status={paymentState.latestPayment.verificationStatus || paymentState.latestPayment.status} />
                    ) : null}
                  </div>
                </div>
                <p>{service.description || service.notes || 'Assigned by the CA team.'}</p>
                <div className="detail-row">
                  <span>Priority: {service.priority}</span>
                  <span>Updated: {formatDate(service.updatedAt)}</span>
                </div>
                {service.price ? <small>Price: {formatCurrency(service.price)}</small> : null}
                {service.notes ? <small>Your note: {service.notes}</small> : null}
                {service.adminRemarks ? <small>Admin remarks: {service.adminRemarks}</small> : null}
                <small>{getServiceStageTitle(paymentState)}</small>
                <small>{getPaymentHint(service, paymentState)}</small>
                <div className="section-actions">
                  {!paymentState.isServiceCompleted ? (
                    <button className="button button-primary" onClick={() => handleOpenUploadDocuments(service.type)} type="button">
                      {paymentState.isServiceRejected ? 'Upload Corrected Documents' : 'Upload Documents'}
                    </button>
                  ) : null}
                  {paymentState.isReadyForPayment ? (
                    <button className="button button-secondary" onClick={() => handleProceedToPayment(service)} type="button">
                      {paymentState.latestRejectedPayment ? 'Retry Payment' : 'Proceed to Payment'}
                    </button>
                  ) : paymentState.hasPendingPayment || paymentState.hasVerifiedPayment || paymentState.latestPayment ? (
                    <button className="button button-secondary" onClick={() => navigate('/dashboard/payments')} type="button">
                      Open Payments
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState description="Selected services will appear here after you choose one from the catalog." title="No active services found" />
        )}
      </section>
    </div>
  )
}

export default Services
