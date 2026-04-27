import { useEffect, useState } from 'react'
import PageHeader from '../../components/common/PageHeader.jsx'
import StatCard from '../../components/common/StatCard.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import Loader from '../../components/common/Loader.jsx'
import api, { extractApiError } from '../../lib/api.js'
import { formatCurrency, formatDate } from '../../lib/formatters.js'

function Dashboard() {
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/api/services'),
      api.get('/api/documents'),
      api.get('/api/appointments'),
      api.get('/api/payments'),
      api.get('/api/notifications'),
    ])
      .then(([servicesRes, documentsRes, appointmentsRes, paymentsRes, notificationsRes]) => {
        const services = servicesRes.data.services
        const documents = documentsRes.data.documents
        const appointments = appointmentsRes.data.appointments
        const payments = paymentsRes.data.payments
        const notifications = notificationsRes.data.notifications

        setSummary({
          services,
          documents,
          appointments,
          payments,
          notifications,
          totalServices: services.length,
          pendingWork: services.filter((item) => item.status !== 'completed').length,
          completedWork: services.filter((item) => item.status === 'completed').length,
          outstandingPayments: payments.filter((item) => item.status !== 'paid').length,
        })
      })
      .catch((err) => {
        setError(extractApiError(err))
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  if (loading) {
    return <Loader message="Loading dashboard..." />
  }

  return (
    <div className="page-stack">
      <PageHeader
        description="Track your active assignments, pending items, recent notifications, and upcoming meetings."
        eyebrow="Overview"
        title="Client Dashboard"
      />

      {error ? <p className="form-message error">{error}</p> : null}

      {summary ? (
        <>
          <section className="stats-grid">
            <StatCard hint="Assignments under your account" label="Total Services" value={summary.totalServices} />
            <StatCard hint="Still in progress or pending review" label="Pending Work" value={summary.pendingWork} />
            <StatCard hint="Closed and completed requests" label="Completed Work" value={summary.completedWork} />
            <StatCard hint="Invoices awaiting payment" label="Outstanding Payments" value={summary.outstandingPayments} />
          </section>

          <section className="card-grid two-up">
            <article className="panel">
              <h3>Upcoming Appointments</h3>
              {summary.appointments.length ? (
                <div className="list-stack">
                  {summary.appointments.slice(0, 3).map((appointment) => (
                    <div className="list-item" key={appointment._id}>
                      <div>
                        <strong>{formatDate(appointment.scheduledFor, { dateStyle: 'medium', timeStyle: 'short' })}</strong>
                        <p>{appointment.notes || 'Consultation booked with the CA team.'}</p>
                      </div>
                      <StatusBadge status={appointment.status} />
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  description="Book a consultation from the appointments section."
                  title="No appointments yet"
                />
              )}
            </article>

            <article className="panel">
              <h3>Recent Notifications</h3>
              {summary.notifications.length ? (
                <div className="list-stack">
                  {summary.notifications.slice(0, 4).map((notice) => (
                    <div className="list-item" key={notice._id}>
                      <div>
                        <strong>{notice.title}</strong>
                        <p>{notice.message}</p>
                      </div>
                      <span className="list-meta">{formatDate(notice.createdAt)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  description="System updates will start showing here once activity begins."
                  title="No notifications yet"
                />
              )}
            </article>
          </section>

          <section className="card-grid two-up">
            <article className="panel">
              <h3>Latest Documents</h3>
              {summary.documents.length ? (
                <div className="list-stack">
                  {summary.documents.slice(0, 4).map((document) => (
                    <div className="list-item" key={document._id}>
                      <div>
                        <strong>{document.title}</strong>
                        <p>{document.serviceType}</p>
                      </div>
                      <StatusBadge status={document.status} />
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState description="Upload your first file from the documents section." title="No documents uploaded" />
              )}
            </article>

            <article className="panel">
              <h3>Payment Snapshot</h3>
              {summary.payments.length ? (
                <div className="list-stack">
                  {summary.payments.slice(0, 4).map((payment) => (
                    <div className="list-item" key={payment._id}>
                      <div>
                        <strong>{payment.invoiceNumber}</strong>
                        <p>{payment.serviceType}</p>
                      </div>
                      <div className="list-meta-group">
                        <span>{formatCurrency(payment.amount)}</span>
                        <StatusBadge status={payment.status} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState description="Invoices will appear once they are created." title="No invoices found" />
              )}
            </article>
          </section>
        </>
      ) : null}
    </div>
  )
}

export default Dashboard
