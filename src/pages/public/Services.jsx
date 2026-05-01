import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Loader from '../../components/common/Loader.jsx'
import api, { extractApiError } from '../../lib/api.js'
import { formatCurrency } from '../../lib/formatters.js'
import { getServiceSelectionById } from '../../data/serviceSelectionFlow.js'
import { serviceCatalog } from '../../data/siteData.js'

function buildUploadLink(service) {
  const guide = getServiceSelectionById(service.serviceSelectionId)

  if (!guide) {
    return {
      href: '/login',
      image: null,
    }
  }

  const documentType = service.documentType || service.title
  const imageIndex = Math.max(guide.documentTypes.indexOf(documentType), 0)
  const cardImage = guide.cardImages[imageIndex] || guide.cardImages[0] || null
  const query = new URLSearchParams({
    service: guide.id,
    documentType,
  })

  return {
    href: `/dashboard/upload-documents?${query.toString()}`,
    image: cardImage,
  }
}

function Services() {
  const [catalogItems, setCatalogItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get('/api/services/public-catalog')
      .then(({ data }) => {
        setCatalogItems(data.services || [])
      })
      .catch((requestError) => {
        setError(extractApiError(requestError))
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const catalogLookup = useMemo(
    () => new Map((catalogItems || []).map((item) => [item.name, item])),
    [catalogItems],
  )

  if (loading) {
    return <Loader message="Loading services..." />
  }

  return (
    <div className="page-stack container">
      <section className="page-hero">
        <span className="eyebrow">What We Do</span>
        <h1>Chartered accountant services designed around timelines, documentation, and outcomes.</h1>
        <p>
          Tap any service card below to open its document submission flow in a new page and start
          the required upload process directly.
        </p>
      </section>

      {error ? <p className="form-message error">{error}</p> : null}

      <section className="dashboard-services-grid public-services-grid">
        {serviceCatalog.map((service) => {
          const { href, image } = buildUploadLink(service)
          const liveCatalogItem = catalogLookup.get(service.title)
          const displayCopy = liveCatalogItem?.description || service.summary

          return (
            <a
              className="service-selection-card public-service-card"
              href={href}
              key={service.title}
              rel="noreferrer"
              target="_blank"
            >
              {image ? (
                <div className="service-card-media">
                  <img
                    alt={image.alt || `${service.title} poster`}
                    loading="lazy"
                    src={image.src}
                    style={image.style}
                  />
                </div>
              ) : null}

              <div className="service-card-body">
                <div className="service-card-topline">
                  <strong>{service.title}</strong>
                  <span className="status-badge neutral service-card-price">
                    {typeof liveCatalogItem?.price === 'number'
                      ? formatCurrency(liveCatalogItem.price)
                      : 'Price on request'}
                  </span>
                </div>
                <p>{displayCopy}</p>
                <ul className="bullet-list service-card-points">
                  {service.deliverables.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <span className="service-card-link">Open document submission</span>
                <small className="service-card-cta-note">Opens in a new page</small>
              </div>
            </a>
          )
        })}
      </section>

      <section className="cta-banner">
        <div>
          <span className="eyebrow">Need help first?</span>
          <h2>Share your requirement and we&apos;ll recommend the right service package.</h2>
        </div>
        <Link className="button button-secondary" to="/contact">
          Talk to an Expert
        </Link>
      </section>
    </div>
  )
}

export default Services
