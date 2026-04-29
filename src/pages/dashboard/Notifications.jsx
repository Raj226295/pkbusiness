import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../../components/common/PageHeader.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import Loader from '../../components/common/Loader.jsx'
import api, { extractApiError } from '../../lib/api.js'
import { formatDateTime } from '../../lib/formatters.js'

function categoryLabel(category = 'general') {
  const normalized = String(category).toLowerCase()

  if (normalized === 'response') return 'Admin Reply'
  if (normalized === 'payment') return 'Payment'
  if (normalized === 'appointment') return 'Appointment'
  if (normalized === 'service') return 'Service'
  if (normalized === 'document') return 'Document'
  if (normalized === 'security') return 'Security'

  return 'General'
}

function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState({ type: '', message: '' })
  const navigate = useNavigate()

  const summary = useMemo(() => {
    return {
      total: notifications.length,
      unread: notifications.filter((notification) => !notification.read).length,
      adminReplies: notifications.filter((notification) => notification.category === 'response').length,
    }
  }, [notifications])

  const loadNotifications = async () => {
    const { data } = await api.get('/api/notifications')
    setNotifications(data.notifications)
  }

  useEffect(() => {
    loadNotifications()
      .catch((error) => {
        setStatus({ type: 'error', message: extractApiError(error) })
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const markAsRead = async (notificationId) => {
    await api.patch(`/api/notifications/${notificationId}/read`)
    setNotifications((current) =>
      current.map((notification) =>
        notification._id === notificationId ? { ...notification, read: true } : notification,
      ),
    )
  }

  const markAllAsRead = async () => {
    try {
      await api.patch('/api/notifications/read-all')
      await loadNotifications()
      setStatus({ type: 'success', message: 'All notifications marked as read.' })
    } catch (error) {
      setStatus({ type: 'error', message: extractApiError(error) })
    }
  }

  const openNotificationAction = async (notification) => {
    try {
      if (!notification.read) {
        await markAsRead(notification._id)
      }

      if (notification.fileUrl) {
        window.open(notification.fileUrl, '_blank', 'noopener,noreferrer')
        return
      }

      if (notification.link) {
        navigate(notification.link)
      }
    } catch (error) {
      setStatus({ type: 'error', message: extractApiError(error) })
    }
  }

  if (loading) {
    return <Loader message="Loading notifications..." />
  }

  return (
    <div className="page-stack">
      <PageHeader
        actions={
          notifications.length ? (
            <button className="button button-ghost" onClick={markAllAsRead} type="button">
              Mark all as read
            </button>
          ) : null
        }
        description="Read admin replies, document review updates, payment verification messages, and request responses from one place."
        eyebrow="Messages"
        title="Messages & Responses"
      />

      <section className="card-grid three-up">
        <article className="panel admin-summary-panel">
          <span className="eyebrow">Total</span>
          <h3>All notifications</h3>
          <p className="hero-number">{summary.total}</p>
        </article>
        <article className="panel admin-summary-panel">
          <span className="eyebrow">Unread</span>
          <h3>Pending reads</h3>
          <p className="hero-number">{summary.unread}</p>
        </article>
        <article className="panel admin-summary-panel">
          <span className="eyebrow">Replies</span>
          <h3>Admin messages</h3>
          <p className="hero-number">{summary.adminReplies}</p>
        </article>
      </section>

      {status.message ? <p className={`form-message ${status.type}`}>{status.message}</p> : null}

      {notifications.length ? (
        <div className="list-stack">
          {notifications.map((notification) => (
            <article
              className={`panel notification-card ${notification.read ? 'muted' : 'unread'}`}
              key={notification._id}
            >
              <div className="list-item stretch">
                <div className="notification-copy">
                  <div className="notification-head">
                    {!notification.read ? <span className="notification-dot" aria-label="Unread notification" /> : null}
                    <strong>{notification.title}</strong>
                    <span className="status-badge neutral">{categoryLabel(notification.category)}</span>
                  </div>
                  <p>{notification.message}</p>
                  {notification.actionLabel || notification.fileUrl || notification.link ? (
                    <button
                      className="button button-ghost notification-action"
                      onClick={() => openNotificationAction(notification)}
                      type="button"
                    >
                      {notification.actionLabel || 'Open'}
                    </button>
                  ) : null}
                </div>
                <span className="list-meta">{formatDateTime(notification.createdAt)}</span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState description="Admin replies and system responses will appear here." title="No messages available" />
      )}
    </div>
  )
}

export default Notifications
