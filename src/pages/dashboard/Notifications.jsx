import { useEffect, useState } from 'react'
import PageHeader from '../../components/common/PageHeader.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import Loader from '../../components/common/Loader.jsx'
import api, { extractApiError } from '../../lib/api.js'
import { formatDate } from '../../lib/formatters.js'

function Notifications() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState({ type: '', message: '' })

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

  const markAllAsRead = async () => {
    try {
      await api.patch('/api/notifications/read-all')
      await loadNotifications()
      setStatus({ type: 'success', message: 'All notifications marked as read.' })
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
        description="View alerts for uploaded documents, service updates, payments, and appointments."
        eyebrow="Notifications"
        title="Activity Feed"
      />

      {status.message ? <p className={`form-message ${status.type}`}>{status.message}</p> : null}

      {notifications.length ? (
        <div className="list-stack">
          {notifications.map((notification) => (
            <article className={`panel notification-card ${notification.read ? 'muted' : ''}`} key={notification._id}>
              <div className="list-item">
                <div>
                  <strong>{notification.title}</strong>
                  <p>{notification.message}</p>
                </div>
                <span className="list-meta">{formatDate(notification.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}</span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState description="You are all caught up for now." title="No notifications available" />
      )}
    </div>
  )
}

export default Notifications
