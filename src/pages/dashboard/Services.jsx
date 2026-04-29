import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../../components/common/PageHeader.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import Loader from '../../components/common/Loader.jsx'
import { getServiceSelectionByDocumentType } from '../../data/serviceSelectionFlow.js'
import api, { extractApiError } from '../../lib/api.js'
import { formatCurrency, formatDate } from '../../lib/formatters.js'

function Services() {
  const [services, setServices] = useState([])
  const [catalog, setCatalog] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const selectedServices = useMemo(
    () => services.filter((service) => ['pending', 'in progress', 'completed'].includes(service.status)),
    [services],
  )

  const availableServices = useMemo(() => {
    return catalog.map((service) => {
      const guide = getServiceSelectionByDocumentType(service.name)
      const imageIndex = guide ? Math.max(guide.documentTypes.indexOf(service.name), 0) : -1

      return {
        ...service,
        guide,
        cardImage: guide ? guide.cardImages[imageIndex] || guide.cardImages[0] : null,
      }
    })
  }, [catalog])

  const loadData = async () => {
    const [servicesRes, catalogRes] = await Promise.all([api.get('/api/services'), api.get('/api/services/catalog')])
    setServices(servicesRes.data.services)
    setCatalog(catalogRes.data.services)
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

  const handleOpenUploadDocuments = (serviceName) => {
    const guide = getServiceSelectionByDocumentType(serviceName)

    if (!guide) {
      navigate('/dashboard/upload-documents')
      return
    }

    const query = new URLSearchParams({
      service: guide.id,
      documentType: serviceName,
    })

    navigate(`/dashboard/upload-documents?${query.toString()}`)
  }

  const handleProceedToPayment = (service) => {
    navigate('/dashboard/payments', {
      state: {
        catalogServiceId: service.catalogService?._id || '',
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
                onClick={() => handleOpenUploadDocuments(service.name)}
                type="button"
              >
                {service.cardImage ? (
                  <div className="service-card-media">
                    <img alt={`${service.name} poster`} loading="lazy" src={service.cardImage.src} />
                  </div>
                ) : null}
                <div className="service-card-body">
                  <strong>{service.name}</strong>
                  <p>{service.description || service.guide?.summary || 'Professional support for this service.'}</p>
                  <span className="status-badge success service-card-price">{formatCurrency(service.price)}</span>
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

        {selectedServices.length ? (
          <div className="card-grid two-up">
            {selectedServices.map((service) => (
              <article className="panel" key={service._id}>
                <div className="list-item">
                  <strong>{service.type}</strong>
                  <StatusBadge status={service.status} />
                </div>
                <p>{service.description || service.notes || 'Assigned by the CA team.'}</p>
                <div className="detail-row">
                  <span>Priority: {service.priority}</span>
                  <span>Updated: {formatDate(service.updatedAt)}</span>
                </div>
                {service.price ? <small>Price: {formatCurrency(service.price)}</small> : null}
                {service.notes ? <small>Your note: {service.notes}</small> : null}
                {service.adminRemarks ? <small>Admin remarks: {service.adminRemarks}</small> : null}
                <div className="section-actions">
                  <button className="button button-primary" onClick={() => handleOpenUploadDocuments(service.type)} type="button">
                    Upload Documents
                  </button>
                  {['pending', 'in progress'].includes(service.status) ? (
                    <button className="button button-secondary" onClick={() => handleProceedToPayment(service)} type="button">
                      Proceed to Payment
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
