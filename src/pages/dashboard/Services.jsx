import { useEffect, useState } from 'react'
import PageHeader from '../../components/common/PageHeader.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import Loader from '../../components/common/Loader.jsx'
import api, { extractApiError } from '../../lib/api.js'
import { formatDate } from '../../lib/formatters.js'

function Services() {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get('/api/services')
      .then(({ data }) => {
        setServices(data.services)
      })
      .catch((err) => {
        setError(extractApiError(err))
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  if (loading) {
    return <Loader message="Loading services..." />
  }

  return (
    <div className="page-stack">
      <PageHeader
        description="Monitor active assignments like ITR, GST, and audit work from one place."
        eyebrow="Services"
        title="Service Tracker"
      />

      {error ? <p className="form-message error">{error}</p> : null}

      {services.length ? (
        <section className="card-grid two-up">
          {services.map((service) => (
            <article className="panel" key={service._id}>
              <div className="list-item">
                <strong>{service.type}</strong>
                <StatusBadge status={service.status} />
              </div>
              <p>{service.notes || 'Assigned by the CA team.'}</p>
              <div className="detail-row">
                <span>Priority: {service.priority}</span>
                <span>Updated: {formatDate(service.updatedAt)}</span>
              </div>
              {service.adminRemarks ? <small>Remarks: {service.adminRemarks}</small> : null}
            </article>
          ))}
        </section>
      ) : (
        <EmptyState description="Assigned services will appear here once the admin creates them." title="No active services found" />
      )}
    </div>
  )
}

export default Services
