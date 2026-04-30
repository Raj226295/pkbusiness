import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../../components/common/PageHeader.jsx'
import StatCard from '../../components/common/StatCard.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import Loader from '../../components/common/Loader.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import { getServiceSelectionByDocumentType } from '../../data/serviceSelectionFlow.js'
import api, { extractApiError } from '../../lib/api.js'
import { formatCurrency, formatDateTime } from '../../lib/formatters.js'
import { getServicePaymentEligibility } from '../../lib/paymentEligibility.js'
import { resolveUploadUrl } from '../../lib/uploads.js'

function isActiveServiceStatus(status = '') {
  return !['rejected', 'completed'].includes(status)
}

function getServiceSnapshotMessage(service, paymentState) {
  switch (paymentState.stage) {
    case 'service_completed':
      return service.adminRemarks || 'Admin marked this service as completed.'
    case 'service_rejected':
      return service.adminRemarks || 'Admin rejected this service. Please review the remark.'
    case 'service_in_progress':
      return 'Payment verified. Work on this service is now in progress.'
    case 'approved':
      return 'Payment verified successfully.'
    case 'under_review':
      return 'Payment screenshot is under admin verification.'
    case 'ready':
      return 'Admin approved this service and payment is ready.'
    case 'retry':
      return paymentState.latestPayment?.reviewRemarks || 'Previous payment was rejected. Retry payment.'
    case 'awaiting_price':
      return 'Documents are approved. Final price is still pending from admin.'
    case 'review_pending':
      return 'Documents are under admin review.'
    case 'service_pending_approval':
      return 'Service request is waiting for admin approval.'
    default:
      return service.description || service.notes || 'Assigned by the CA team.'
  }
}

function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/api/services'),
      api.get('/api/services/catalog'),
      api.get('/api/documents'),
      api.get('/api/appointments'),
      api.get('/api/payments'),
      api.get('/api/notifications'),
    ])
      .then(([servicesRes, catalogRes, documentsRes, appointmentsRes, paymentsRes, notificationsRes]) => {
        const services = servicesRes.data.services
        const catalogServices = catalogRes.data.services
        const documents = documentsRes.data.documents
        const appointments = appointmentsRes.data.appointments
        const payments = paymentsRes.data.payments
        const notifications = notificationsRes.data.notifications

        setSummary({
          services,
          catalogServices,
          documents,
          appointments,
          payments,
          notifications,
          totalServices: services.length,
          activeServices: services.filter((item) => isActiveServiceStatus(item.status)).length,
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

  const paymentActionServices = useMemo(() => {
    if (!summary) {
      return []
    }

    return summary.services
      .map((service) => ({
        service,
        paymentState: getServicePaymentEligibility({
          service,
          documents: summary.documents,
          payments: summary.payments,
        }),
      }))
      .filter(({ paymentState }) => paymentState.isReadyForPayment)
  }, [summary])

  const serviceStates = useMemo(() => {
    if (!summary) {
      return []
    }

    return summary.services.map((service) => ({
      service,
      paymentState: getServicePaymentEligibility({
        service,
        documents: summary.documents,
        payments: summary.payments,
      }),
    }))
  }, [summary])

  const availableCatalogServices = useMemo(() => {
    if (!summary) {
      return []
    }

    return (summary.catalogServices || []).map((service) => {
      const guide = getServiceSelectionByDocumentType(service.name)
      const imageIndex = guide ? Math.max(guide.documentTypes.indexOf(service.name), 0) : -1

      return {
        ...service,
        guide,
        cardImageUrl: service.image
          ? resolveUploadUrl(service.image)
          : guide
            ? (guide.cardImages[imageIndex] || guide.cardImages[0])?.src || ''
            : '',
        cardImageAlt: guide ? (guide.cardImages[imageIndex] || guide.cardImages[0])?.alt || `${service.name} poster` : `${service.name} poster`,
        cardImageStyle: service.image
          ? {
              objectPosition: `${50 + Number(service.imageOffsetX || 0)}% ${50 + Number(service.imageOffsetY || 0)}%`,
              transform: `scale(${Number(service.imageZoom || 1)})`,
            }
          : undefined,
        summaryCopy: guide?.summary || service.description || 'Upload documents to start this service.',
      }
    })
  }, [summary])

  if (loading) {
    return <Loader message="Loading dashboard..." />
  }

  const handleServiceSelect = (serviceId) => {
    if (!serviceId) {
      navigate('/dashboard/upload-documents')
      return
    }

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

          <section className="panel">
            <div className="document-history-head">
              <div>
                <span className="eyebrow">Payment Box</span>
                <h3>Ready payment actions</h3>
                <p>Payment tabhi yahan dikhai dega jab admin service approve karega, documents review karega, aur final price set karega.</p>
              </div>
            </div>

            {paymentActionServices.length ? (
              <div className="list-stack">
                {paymentActionServices.map(({ service, paymentState }) => (
                  <div className="card-inline" key={service._id}>
                    <div className="list-item stretch">
                      <div>
                        <strong>{service.type}</strong>
                        <p>{service.description || 'Service is ready for payment.'}</p>
                        <small>{formatCurrency(service.price || 0)}</small>
                      </div>
                      <button
                        className="button button-primary"
                        onClick={() =>
                          navigate('/dashboard/payments', {
                            state: {
                              serviceId: service._id,
                            },
                          })
                        }
                        type="button"
                      >
                        {paymentState.latestRejectedPayment ? 'Retry Payment' : 'Pay Now'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                description="Upload documents first. Payment box yahin show hoga jab admin approval, review, aur price update complete karega."
                title="No payment action yet"
              />
            )}
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

            {availableCatalogServices.length ? (
              <div className="dashboard-services-grid">
                {availableCatalogServices.map((service) => (
                  <button
                    className="service-selection-card"
                    key={service._id}
                    onClick={() => handleServiceSelect(service.guide?.id || '')}
                    type="button"
                  >
                    {service.cardImageUrl ? (
                      <div className="service-card-media">
                        <img alt={service.cardImageAlt} loading="lazy" src={service.cardImageUrl} style={service.cardImageStyle} />
                      </div>
                    ) : null}
                    <div className="service-card-body">
                      <strong>{service.name}</strong>
                      <p>{service.summaryCopy}</p>
                      <span className="service-card-link">Submit documents</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState
                description="Admin service catalog publish karega to yahan available services dikhengi."
                title="No services available"
              />
            )}
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

              {serviceStates.length ? (
                <div className="list-stack">
                  {serviceStates.slice(0, 4).map(({ service, paymentState }) => (
                    <div className="card-inline" key={service._id}>
                      <div className="list-item stretch">
                        <div>
                          <strong>{service.type}</strong>
                          <p>{getServiceSnapshotMessage(service, paymentState)}</p>
                          <small>{service.price ? formatCurrency(service.price) : 'Price will be shared by admin.'}</small>
                        </div>
                        <div className="list-meta-group">
                          <StatusBadge status={service.status} />
                          {paymentState.latestPayment ? (
                            <StatusBadge status={paymentState.latestPayment.verificationStatus || paymentState.latestPayment.status} />
                          ) : null}
                        </div>
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
