import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../../components/common/PageHeader.jsx'
import StatCard from '../../components/common/StatCard.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import Loader from '../../components/common/Loader.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { serviceSelectionFlow } from '../../data/serviceSelectionFlow.js'
import api, { extractApiError } from '../../lib/api.js'
import { formatCurrency, formatDateTime } from '../../lib/formatters.js'

function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
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
          activeServices: services.filter((item) => item.status !== 'completed').length,
          completedServices: services.filter((item) => item.status === 'completed').length,
          pendingDocuments: documents.filter((item) => item.status === 'pending').length,
          unreadNotifications: notifications.filter((item) => !item.read).length,
          pendingPayments: payments.filter(
            (item) => item.status === 'pending' || item.verificationStatus === 'pending',
          ).length,
          totalPaid: payments
            .filter((item) => item.status === 'paid')
            .reduce((total, item) => total + Number(item.amount || 0), 0),
        })
      })
      .catch((err) => {
        setError(extractApiError(err))
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const upcomingAppointments = useMemo(() => {
    if (!summary) {
      return []
    }

    return summary.appointments
      .filter((appointment) => ['pending', 'confirmed', 'scheduled'].includes(appointment.status))
      .slice(0, 3)
  }, [summary])

  const recentActivity = useMemo(() => {
    if (!summary) {
      return []
    }

    return [
      ...summary.documents.slice(0, 3).map((document) => ({
        id: `document-${document._id}`,
        title: document.originalName || document.filename,
        subtitle: `${document.documentType || document.title} uploaded`,
        status: document.status,
        createdAt: document.createdAt,
      })),
      ...summary.payments.slice(0, 3).map((payment) => ({
        id: `payment-${payment._id}`,
        title: payment.invoiceNumber,
        subtitle: `${payment.serviceType} payment update`,
        status: payment.verificationStatus || payment.status,
        createdAt: payment.createdAt,
      })),
      ...summary.notifications.slice(0, 3).map((notice) => ({
        id: `notification-${notice._id}`,
        title: notice.title,
        subtitle: notice.message,
        status: notice.read ? 'completed' : 'pending',
        createdAt: notice.createdAt,
      })),
    ]
      .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
      .slice(0, 6)
  }, [summary])

  if (loading) {
    return <Loader message="Loading dashboard..." />
  }

  const handleServiceSelect = (serviceId) => {
    navigate(`/dashboard/upload-documents?service=${serviceId}`)
  }

  return (
    <div className="page-stack">
      <PageHeader
        description="Track your services, pending documents, invoices, appointment updates, and admin responses from one place."
        eyebrow="Overview"
        title="Client Dashboard"
      />

      {error ? <p className="form-message error">{error}</p> : null}

      {summary ? (
        <>
          <section className="panel">
            <div className="document-history-head">
              <div>
                <span className="eyebrow">Welcome</span>
                <h3>{`Hi ${user?.name || 'Client'} 👋`}</h3>
                <p>Your dashboard keeps your uploads, services, payments, and admin responses in one place.</p>
              </div>
            </div>
          </section>

          <section className="stats-grid admin-stats-grid">
            <StatCard hint="Services assigned to your account" label="Total Services" value={summary.totalServices} />
            <StatCard hint="Open services still moving" label="Active Services" value={summary.activeServices} />
            <StatCard hint="Documents waiting for review" label="Pending Documents" value={summary.pendingDocuments} />
            <StatCard hint="Invoices or proofs awaiting confirmation" label="Pending Payments" value={summary.pendingPayments} />
            <StatCard hint="Amount already cleared" label="Total Paid" value={formatCurrency(summary.totalPaid)} />
          </section>

          <section className="panel dashboard-services-section">
            <div className="document-history-head">
              <div>
                <span className="eyebrow">Services</span>
                <h3>Select a service to start document submission</h3>
                <p>Choose a service below, review the checklist on the next page, and upload the required file.</p>
              </div>
            </div>

            <div className="dashboard-services-grid">
              {serviceSelectionFlow.map((service) => (
                <button
                  className="service-selection-card"
                  key={service.id}
                  onClick={() => handleServiceSelect(service.id)}
                  type="button"
                >
                  <div className={`service-card-media ${service.cardImages.length > 1 ? 'dual' : ''}`}>
                    {service.cardImages.map((image) => (
                      <img alt={image.alt} key={image.alt} loading="lazy" src={image.src} />
                    ))}
                  </div>
                  <div className="service-card-body">
                    <strong>{service.name}</strong>
                    <p>{service.summary}</p>
                    <span className="service-card-link">Submit documents</span>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section className="card-grid three-up">
            <article className="panel admin-summary-panel">
              <span className="eyebrow">Completed</span>
              <h3>Finished services</h3>
              <p className="hero-number">{summary.completedServices}</p>
            </article>
            <article className="panel admin-summary-panel">
              <span className="eyebrow">Alerts</span>
              <h3>Unread notifications</h3>
              <p className="hero-number">{summary.unreadNotifications}</p>
            </article>
            <article className="panel admin-summary-panel">
              <span className="eyebrow">Docs</span>
              <h3>Total documents</h3>
              <p className="hero-number">{summary.documents.length}</p>
            </article>
          </section>

          <section className="panel activity-panel">
            <div className="document-history-head">
              <div>
                <span className="eyebrow">Recent Activity</span>
                <h3>Latest movement in your account</h3>
              </div>
            </div>

            {recentActivity.length ? (
              <div className="list-stack">
                {recentActivity.map((item) => (
                  <div className="card-inline activity-card" key={item.id}>
                    <div className="list-item stretch">
                      <div>
                        <strong>{item.title}</strong>
                        <p>{item.subtitle}</p>
                        <small>{formatDateTime(item.createdAt)}</small>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState description="Recent uploads, payment updates, and responses will appear here." title="No recent activity" />
            )}
          </section>

          <section className="card-grid two-up">
            <article className="panel">
              <div className="document-history-head">
                <div>
                  <span className="eyebrow">Appointments</span>
                  <h3>Upcoming meetings</h3>
                </div>
              </div>

              {upcomingAppointments.length ? (
                <div className="list-stack">
                  {upcomingAppointments.map((appointment) => (
                    <div className="card-inline" key={appointment._id}>
                      <div className="list-item stretch">
                        <div>
                          <strong>{formatDateTime(appointment.scheduledFor)}</strong>
                          <p>{appointment.notes || 'Consultation booked with the CA team.'}</p>
                          {appointment.adminNotes ? <small>Admin notes: {appointment.adminNotes}</small> : null}
                        </div>
                        <StatusBadge status={appointment.status} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  description="Book a consultation from the appointments section when you need help."
                  title="No active appointments"
                />
              )}
            </article>

            <article className="panel">
              <div className="document-history-head">
                <div>
                  <span className="eyebrow">Admin Updates</span>
                  <h3>Recent notifications</h3>
                </div>
              </div>

              {summary.notifications.length ? (
                <div className="list-stack">
                  {summary.notifications.slice(0, 4).map((notice) => (
                    <div className="card-inline" key={notice._id}>
                      <div className="list-item stretch">
                        <div>
                          <div className="activity-title-row">
                            <strong>{notice.title}</strong>
                            <span className={`status-badge ${notice.read ? 'neutral' : 'warning'}`}>
                              {notice.read ? 'Read' : 'Unread'}
                            </span>
                          </div>
                          <p>{notice.message}</p>
                        </div>
                        <span className="list-meta">{formatDateTime(notice.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState
                  description="Admin replies and system updates will start showing here once activity begins."
                  title="No notifications yet"
                />
              )}
            </article>
          </section>

          <section className="card-grid two-up">
            <article className="panel">
              <div className="document-history-head">
                <div>
                  <span className="eyebrow">Services</span>
                  <h3>Assigned work</h3>
                </div>
              </div>

              {summary.services.length ? (
                <div className="list-stack">
                  {summary.services.slice(0, 4).map((service) => (
                    <div className="card-inline" key={service._id}>
                      <div className="list-item stretch">
                        <div>
                          <strong>{service.type}</strong>
                          <p>{service.description || service.notes || 'Assigned by the CA team.'}</p>
                          <small>{service.price ? formatCurrency(service.price) : 'Price will be shared by admin.'}</small>
                        </div>
                        <StatusBadge status={service.status} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <EmptyState description="Assigned services will appear here once the admin creates them." title="No services yet" />
              )}
            </article>

            <article className="panel">
              <div className="document-history-head">
                <div>
                  <span className="eyebrow">Payments</span>
                  <h3>Invoice snapshot</h3>
                </div>
              </div>

              {summary.payments.length ? (
                <div className="list-stack">
                  {summary.payments.slice(0, 4).map((payment) => (
                    <div className="card-inline" key={payment._id}>
                      <div className="list-item stretch">
                        <div>
                          <strong>{payment.invoiceNumber}</strong>
                          <p>{payment.serviceType}</p>
                          <small>{formatCurrency(payment.amount)}</small>
                        </div>
                        <StatusBadge status={payment.verificationStatus || payment.status} />
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
