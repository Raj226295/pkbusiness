import { useEffect, useState } from 'react'
import PageHeader from '../../components/common/PageHeader.jsx'
import StatCard from '../../components/common/StatCard.jsx'
import Loader from '../../components/common/Loader.jsx'
import api, { extractApiError } from '../../lib/api.js'

function AdminDashboard() {
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api
      .get('/api/admin/overview')
      .then(({ data }) => {
        setOverview(data.overview)
      })
      .catch((err) => {
        setError(extractApiError(err))
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  if (loading) {
    return <Loader message="Loading admin overview..." />
  }

  return (
    <div className="page-stack">
      <PageHeader
        description="Monitor the health of user onboarding, pending reviews, active services, and receivables."
        eyebrow="Admin"
        title="Operations Dashboard"
      />

      {error ? <p className="form-message error">{error}</p> : null}

      {overview ? (
        <>
          <section className="stats-grid">
            <StatCard hint="Registered client accounts" label="Users" value={overview.totalUsers} />
            <StatCard hint="Open or in-progress work" label="Active Services" value={overview.activeServices} />
            <StatCard hint="Files awaiting review" label="Pending Documents" value={overview.pendingDocuments} />
            <StatCard hint="Invoices not yet cleared" label="Pending Payments" value={overview.pendingPayments} />
          </section>

          <section className="card-grid two-up">
            <article className="panel">
              <h3>Appointments today</h3>
              <p className="hero-number">{overview.appointmentsToday}</p>
            </article>
            <article className="panel">
              <h3>Pending appointments</h3>
              <p className="hero-number">{overview.pendingAppointments}</p>
            </article>
          </section>
        </>
      ) : null}
    </div>
  )
}

export default AdminDashboard
