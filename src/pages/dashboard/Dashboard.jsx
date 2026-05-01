import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminIcon from '../../components/admin/AdminIcon.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import Loader from '../../components/common/Loader.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import StatCard from '../../components/common/StatCard.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import { useAuth } from '../../context/AuthContext.jsx'
import api, { extractApiError } from '../../lib/api.js'
import { formatCurrency, formatDateTime } from '../../lib/formatters.js'
import { getServicePaymentEligibility } from '../../lib/paymentEligibility.js'
import { resolveUploadUrl } from '../../lib/uploads.js'

function isActiveServiceStatus(status = '') {
  return !['rejected', 'completed'].includes(String(status).trim().toLowerCase())
}

function normalizeAppointmentStatus(status = 'pending') {
  const normalized = String(status).trim().toLowerCase()

  if (normalized === 'confirmed') return 'approved'
  if (normalized === 'scheduled') return 'rescheduled'

  return normalized || 'pending'
}

function getLatestDate(record = {}) {
  return record.updatedAt || record.createdAt || record.scheduledFor || 0
}

function sortByLatest(records = []) {
  return [...records].sort((left, right) => new Date(getLatestDate(right)) - new Date(getLatestDate(left)))
}

function getPaymentSummary(summary, readyToPayCount) {
  if (!summary) {
    return {
      value: 'Clear',
      hint: 'No payment activity yet',
      chipTone: 'neutral',
      chipLabel: 'No dues',
    }
  }

  if (summary.pendingPayments > 0) {
    return {
      value: `${summary.pendingPayments} Pending`,
      hint: 'Payment proofs or invoices are under review',
      chipTone: 'warning',
      chipLabel: 'Verification in progress',
    }
  }

  if (readyToPayCount > 0) {
    return {
      value: `${readyToPayCount} Ready`,
      hint: 'One or more services are ready for payment',
      chipTone: 'info',
      chipLabel: 'Payment action available',
    }
  }

  if (summary.totalPaid > 0) {
    return {
      value: 'Paid',
      hint: `Total paid ${formatCurrency(summary.totalPaid)}`,
      chipTone: 'success',
      chipLabel: 'Payments updated',
    }
  }

  return {
    value: 'Clear',
    hint: 'No pending billing action',
    chipTone: 'neutral',
    chipLabel: 'No dues',
  }
}

function getNotificationActivityConfig(notice = {}) {
  const normalizedCategory = String(notice.category || '').trim().toLowerCase()
  const haystack = `${notice.title || ''} ${notice.message || ''}`.toLowerCase()
  const fallbackTarget = notice.link || '/dashboard/messages'

  if (normalizedCategory === 'document' || /(document|upload|file|attachment|kyc)/.test(haystack)) {
    return {
      actionLabel: notice.actionLabel || 'Open Documents',
      icon: 'document',
      iconTone: 'info',
      kindLabel: 'Document Update',
      target: notice.link || '/dashboard/my-documents',
    }
  }

  if (normalizedCategory === 'payment' || /(payment|invoice|transaction|proof|upi|razorpay|paid)/.test(haystack)) {
    return {
      actionLabel: notice.actionLabel || 'Open Payments',
      icon: 'payment',
      iconTone: 'success',
      kindLabel: 'Payment Update',
      target: notice.link || '/dashboard/payments',
    }
  }

  if (normalizedCategory === 'appointment' || /(appointment|consultation|meeting|schedule|reschedule)/.test(haystack)) {
    return {
      actionLabel: notice.actionLabel || 'Open Appointments',
      icon: 'appointment',
      iconTone: 'warning',
      kindLabel: 'Appointment Update',
      target: notice.link || '/dashboard/appointments',
    }
  }

  if (normalizedCategory === 'service' || /(service|work|task)/.test(haystack)) {
    return {
      actionLabel: notice.actionLabel || 'Open Services',
      icon: 'services',
      iconTone: 'neutral',
      kindLabel: 'Service Update',
      target: notice.link || '/dashboard/services',
    }
  }

  return {
    actionLabel: notice.actionLabel || 'Open Messages',
    icon: 'bell',
    iconTone: notice.read ? 'neutral' : 'warning',
    kindLabel: 'Notification',
    target: fallbackTarget,
  }
}

function getPreviewKind({ url = '', mimeType = '', fileName = '' }) {
  const normalizedMimeType = String(mimeType || '').toLowerCase()
  const normalizedName = `${url} ${fileName}`.toLowerCase()

  if (normalizedMimeType.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(normalizedName)) {
    return 'image'
  }

  if (normalizedMimeType.includes('pdf') || /\.pdf$/i.test(normalizedName)) {
    return 'pdf'
  }

  if (url) {
    return 'file'
  }

  return ''
}

function buildPreviewPayload({ url = '', mimeType = '', fileName = '', title = '' }) {
  if (!url) {
    return null
  }

  return {
    url: resolveUploadUrl(url),
    kind: getPreviewKind({ url, mimeType, fileName }),
    fileName: fileName || title || 'Preview file',
  }
}

function QuickActionButton({ description, icon, label, onClick }) {
  return (
    <button className="quick-action-card" onClick={onClick} type="button">
      <span className="quick-action-icon">
        <AdminIcon name={icon} size={20} />
      </span>
      <span className="quick-action-copy">
        <strong>{label}</strong>
        <p>{description}</p>
        <span>Open</span>
      </span>
    </button>
  )
}

function ActivityCard({ item, onClick }) {
  return (
    <button
      className={`overview-list-item overview-list-item-button${item.isUnread ? ' is-unread' : ''}`}
      onClick={onClick}
      type="button"
    >
      <div className="overview-list-leading">
        <span className={`overview-list-icon ${item.iconTone || 'neutral'}`}>
          <AdminIcon name={item.icon || 'overview'} size={18} />
        </span>
        <div className="overview-list-copy">
          <strong>{item.title}</strong>
          <p>{item.subtitle}</p>
          <small>{formatDateTime(item.createdAt)}</small>
        </div>
      </div>
      <div className="overview-list-meta">
        <StatusBadge status={item.status} />
        <span className="overview-list-action">
          {item.actionLabel || 'Open'}
          <AdminIcon name="reply" size={14} />
        </span>
      </div>
    </button>
  )
}

function ActivityPreviewContent({ item }) {
  if (!item?.preview?.url) {
    return null
  }

  if (item.preview.kind === 'image') {
    return (
      <div className="overview-activity-preview-frame">
        <div className="overview-activity-preview-head">
          <span className="eyebrow">Preview</span>
          <span>{item.preview.fileName}</span>
        </div>
        <img
          alt={item.title || item.preview.fileName || 'Activity preview'}
          className="overview-activity-preview-image"
          loading="lazy"
          src={item.preview.url}
        />
      </div>
    )
  }

  if (item.preview.kind === 'pdf') {
    return (
      <div className="overview-activity-preview-frame">
        <div className="overview-activity-preview-head">
          <span className="eyebrow">Preview</span>
          <span>{item.preview.fileName}</span>
        </div>
        <iframe className="overview-activity-preview-pdf" src={item.preview.url} title={item.preview.fileName || item.title || 'PDF preview'} />
      </div>
    )
  }

  return (
    <div className="overview-activity-file-card">
      <span className="overview-activity-file-icon">
        <AdminIcon name="document" size={20} />
      </span>
      <div>
        <strong>{item.preview.fileName}</strong>
        <p>Inline preview is not available for this file type, but you can open it directly from here.</p>
      </div>
    </div>
  )
}

function ActivityPreviewModal({ item, onClose, onOpenSection }) {
  if (!item) {
    return null
  }

  return (
    <div className="overview-activity-modal-backdrop" onClick={onClose} role="presentation">
      <div
        aria-modal="true"
        className="overview-activity-modal"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="overview-activity-modal-head">
          <div className="overview-activity-modal-identity">
            <span className={`overview-activity-modal-icon ${item.iconTone || 'neutral'}`}>
              <AdminIcon name={item.icon || 'overview'} size={22} />
            </span>
            <div>
              <span className="eyebrow">{item.kindLabel || 'Activity'}</span>
              <h3>{item.title}</h3>
            </div>
          </div>

          <button aria-label="Close activity preview" className="overview-activity-close" onClick={onClose} type="button">
            <AdminIcon name="close" size={18} />
          </button>
        </div>

        <div className="overview-activity-modal-body">
          <p>{item.subtitle}</p>

          <ActivityPreviewContent item={item} />

          <div className="overview-activity-detail-grid">
            <div className="overview-activity-detail-card">
              <span>Status</span>
              <div>
                <StatusBadge status={item.status} />
              </div>
            </div>
            <div className="overview-activity-detail-card">
              <span>Updated</span>
              <strong>{formatDateTime(item.createdAt)}</strong>
            </div>
            <div className="overview-activity-detail-card">
              <span>{item.detailLabel || 'Section'}</span>
              <strong>{item.detailValue || 'Open the related section for more details.'}</strong>
            </div>
          </div>

          <div className="overview-activity-modal-actions">
            {item.preview?.url ? (
              <button
                className="button button-secondary"
                onClick={() => window.open(item.preview.url, '_blank', 'noopener,noreferrer')}
                type="button"
              >
                Open Preview
              </button>
            ) : null}
            <button className="button button-primary" onClick={onOpenSection} type="button">
              {item.actionLabel || 'Open'}
            </button>
            <button className="button button-ghost" onClick={onClose} type="button">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [summary, setSummary] = useState(null)
  const [selectedActivity, setSelectedActivity] = useState(null)
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
        const services = servicesRes.data.services || []
        const documents = documentsRes.data.documents || []
        const appointments = appointmentsRes.data.appointments || []
        const payments = paymentsRes.data.payments || []
        const notifications = notificationsRes.data.notifications || []

        setSummary({
          services,
          documents,
          appointments,
          payments,
          notifications,
          totalServices: services.length,
          activeServices: services.filter((item) => isActiveServiceStatus(item.status)).length,
          completedServices: services.filter((item) => item.status === 'completed').length,
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

  useEffect(() => {
    if (!selectedActivity) {
      return undefined
    }

    const previousOverflow = document.body.style.overflow
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setSelectedActivity(null)
      }
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [selectedActivity])

  const readyToPayCount = useMemo(() => {
    if (!summary) {
      return 0
    }

    return summary.services.filter((service) =>
      getServicePaymentEligibility({
        service,
        documents: summary.documents,
        payments: summary.payments,
      }).isReadyForPayment,
    ).length
  }, [summary])

  const paymentSummary = useMemo(() => getPaymentSummary(summary, readyToPayCount), [readyToPayCount, summary])

  const recentActivity = useMemo(() => {
    if (!summary) {
      return []
    }

    const items = [
      ...sortByLatest(summary.documents).slice(0, 2).map((document) => ({
        id: `document-${document._id}`,
        title: document.originalName || document.filename || 'Document uploaded',
        subtitle: document.documentType || document.title || 'Document update',
        status: document.status,
        createdAt: document.createdAt,
        detailLabel: 'Service',
        detailValue: document.serviceType || 'General service',
        preview: buildPreviewPayload({
          url: document.fileUrl,
          mimeType: document.mimeType,
          fileName: document.originalName || document.filename,
          title: document.title,
        }),
        icon: 'document',
        iconTone: 'info',
        kindLabel: 'Document Activity',
        target: '/dashboard/my-documents',
        actionLabel: 'Open Documents',
      })),
      ...sortByLatest(summary.payments).slice(0, 1).map((payment) => ({
        id: `payment-${payment._id}`,
        title: payment.invoiceNumber || 'Payment update',
        subtitle: payment.serviceType || 'Service payment status',
        status: payment.verificationStatus || payment.status,
        createdAt: payment.createdAt,
        detailLabel: 'Amount',
        detailValue: formatCurrency(payment.amount || 0),
        preview: buildPreviewPayload({
          url: payment.screenshotUrl,
          fileName: payment.screenshotName || payment.invoiceNumber,
          title: payment.invoiceNumber,
        }),
        icon: 'payment',
        iconTone: 'success',
        kindLabel: 'Payment Activity',
        target: '/dashboard/payments',
        actionLabel: 'Open Payments',
      })),
      ...sortByLatest(summary.appointments).slice(0, 1).map((appointment) => ({
        id: `appointment-${appointment._id}`,
        title: appointment.serviceType || 'General consultation',
        subtitle: `Appointment ${normalizeAppointmentStatus(appointment.status)}`,
        status: normalizeAppointmentStatus(appointment.status),
        createdAt: appointment.updatedAt || appointment.createdAt || appointment.scheduledFor,
        detailLabel: 'Scheduled For',
        detailValue: appointment.scheduledFor ? formatDateTime(appointment.scheduledFor) : 'To be confirmed',
        icon: 'appointment',
        iconTone: 'warning',
        kindLabel: 'Appointment Activity',
        target: '/dashboard/appointments',
        actionLabel: 'Open Appointments',
      })),
      ...sortByLatest(summary.notifications).slice(0, 1).map((notice) => {
        const activityConfig = getNotificationActivityConfig(notice)

        return {
          id: `notification-${notice._id}`,
          title: notice.title,
          subtitle: notice.message,
          status: notice.read ? 'completed' : 'pending',
          createdAt: notice.createdAt,
          detailLabel: 'Message',
          detailValue: notice.message || 'Open the related section for more details.',
          preview: buildPreviewPayload({
            url: notice.fileUrl,
            fileName: notice.title,
            title: notice.title,
          }),
          icon: activityConfig.icon,
          iconTone: activityConfig.iconTone,
          kindLabel: activityConfig.kindLabel,
          target: activityConfig.target,
          actionLabel: activityConfig.actionLabel,
          isUnread: !notice.read,
        }
      }),
    ]

    return items.sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt)).slice(0, 4)
  }, [summary])

  const latestNotifications = useMemo(() => {
    if (!summary) {
      return []
    }

    return sortByLatest(summary.notifications).slice(0, 3)
  }, [summary])

  if (loading) {
    return <Loader message="Loading dashboard..." />
  }

  const quickActions = [
    {
      label: 'Upload Documents',
      description: 'Submit required files for your service.',
      icon: 'document',
      onClick: () => navigate('/dashboard/upload-documents'),
    },
    {
      label: 'Book Appointment',
      description: 'Schedule a consultation with the CA team.',
      icon: 'appointment',
      onClick: () => navigate('/dashboard/appointments'),
    },
    {
      label: 'Make Payment',
      description: 'Check invoices and complete pending payments.',
      icon: 'payment',
      onClick: () => navigate('/dashboard/payments'),
    },
  ]

  return (
    <div className="page-stack dashboard-overview-page">
      <PageHeader
        description="Track your work, payments, and latest updates from one clean overview."
        eyebrow="Overview"
        title="Client Dashboard"
      />

      {error ? <p className="form-message error">{error}</p> : null}

      {summary ? (
        <>
          <section className="panel dashboard-overview-welcome">
            <div>
              <span className="eyebrow">Welcome</span>
              <h3>{`Hi ${user?.name || 'Client'}`}</h3>
              <p>
                Yahan aap quickly apne services, pending work, payments, aur latest account activity dekh sakte hain.
              </p>
            </div>

            <div className="dashboard-overview-meta">
              <span className="dashboard-overview-meta-item">
                <AdminIcon name="payment" size={16} />
                <strong>{paymentSummary.value}</strong>
                <span>{paymentSummary.chipLabel}</span>
              </span>
              <span className="dashboard-overview-meta-item">
                <AdminIcon name="bell" size={16} />
                <strong>{summary.unreadNotifications}</strong>
                <span>Unread notifications</span>
              </span>
              <span className="dashboard-overview-meta-item">
                <AdminIcon name="services" size={16} />
                <strong>{formatCurrency(summary.totalPaid)}</strong>
                <span>Total paid</span>
              </span>
            </div>
          </section>

          <section className="stats-grid dashboard-overview-stats">
            <StatCard
              actionLabel="Open Services"
              hint="All services linked to your account"
              label="Total Services"
              to="/dashboard/services"
              value={summary.totalServices}
            />
            <StatCard
              actionLabel="Review Work"
              hint="Services currently in progress or waiting"
              label="Pending Work"
              to="/dashboard/services"
              value={summary.activeServices}
            />
            <StatCard
              actionLabel="View History"
              hint="Services already completed"
              label="Completed Work"
              to="/dashboard/services"
              value={summary.completedServices}
            />
            <StatCard
              actionLabel="Open Payments"
              hint={paymentSummary.hint}
              label="Payment Status"
              to="/dashboard/payments"
              value={paymentSummary.value}
            />
          </section>

          <section className="panel overview-summary-panel">
            <div className="overview-summary-head">
              <div>
                <span className="eyebrow">Recent Activity</span>
                <h3>Latest updates</h3>
                <p>Recent uploads, payment changes, and appointment updates.</p>
              </div>
            </div>

              {recentActivity.length ? (
                <div className="overview-list">
                  {recentActivity.map((item) => (
                    <ActivityCard key={item.id} item={item} onClick={() => setSelectedActivity(item)} />
                  ))}
                </div>
              ) : (
              <EmptyState
                description="Latest activity will appear here once your account starts receiving updates."
                title="No recent activity"
              />
            )}
          </section>

          <section className="panel overview-quick-actions">
            <div className="overview-summary-head">
              <div>
                <span className="eyebrow">Quick Actions</span>
                <h3>Jump into key tasks</h3>
                <p>Use the most common actions directly from your overview page.</p>
              </div>
            </div>

            <div className="quick-action-grid dashboard-quick-action-grid">
              {quickActions.map((action) => (
                <QuickActionButton key={action.label} {...action} />
              ))}
            </div>
          </section>

          {latestNotifications.length ? (
            <section className="panel overview-summary-panel dashboard-notification-panel">
              <div className="overview-summary-head">
                <div>
                  <span className="eyebrow">Notifications</span>
                  <h3>Latest notices</h3>
                  <p>Important admin and system messages in one compact section.</p>
                </div>
                <button className="button button-ghost" onClick={() => navigate('/dashboard/messages')} type="button">
                  View All
                </button>
              </div>

              <div className="overview-list">
                {latestNotifications.map((notice) => (
                  <ActivityCard
                    key={notice._id}
                    item={{
                      title: notice.title,
                      subtitle: notice.message,
                      createdAt: notice.createdAt,
                      status: notice.read ? 'completed' : 'pending',
                      detailLabel: 'Message',
                      detailValue: notice.message || 'Open the related section for more details.',
                      preview: buildPreviewPayload({
                        url: notice.fileUrl,
                        fileName: notice.title,
                        title: notice.title,
                      }),
                      ...getNotificationActivityConfig(notice),
                      isUnread: !notice.read,
                    }}
                    onClick={() => setSelectedActivity({
                      title: notice.title,
                      subtitle: notice.message,
                      createdAt: notice.createdAt,
                      status: notice.read ? 'completed' : 'pending',
                      detailLabel: 'Message',
                      detailValue: notice.message || 'Open the related section for more details.',
                      preview: buildPreviewPayload({
                        url: notice.fileUrl,
                        fileName: notice.title,
                        title: notice.title,
                      }),
                      ...getNotificationActivityConfig(notice),
                      isUnread: !notice.read,
                    })}
                  />
                ))}
              </div>
            </section>
          ) : null}

          <ActivityPreviewModal
            item={selectedActivity}
            onClose={() => setSelectedActivity(null)}
            onOpenSection={() => {
              if (!selectedActivity?.target) {
                setSelectedActivity(null)
                return
              }

              navigate(selectedActivity.target)
              setSelectedActivity(null)
            }}
          />
        </>
      ) : null}
    </div>
  )
}

export default Dashboard
