import { useEffect, useMemo, useState } from 'react'
import PageHeader from '../../components/common/PageHeader.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import Loader from '../../components/common/Loader.jsx'
import UserAvatar from '../../components/common/UserAvatar.jsx'
import AdminIcon from '../../components/admin/AdminIcon.jsx'
import api, { extractApiError } from '../../lib/api.js'
import { formatDateTime } from '../../lib/formatters.js'

const initialMessageForm = {
  title: 'Admin update',
  message: '',
}

function itemLabel(kind = 'general') {
  if (kind === 'document') return 'Document'
  if (kind === 'appointment') return 'Appointment'
  if (kind === 'payment') return 'Payment'
  if (kind === 'service') return 'Service'
  if (kind === 'response') return 'Reply'
  return 'Update'
}

function Messages() {
  const [threads, setThreads] = useState([])
  const [summary, setSummary] = useState({ totalThreads: 0, unreadThreads: 0, unreadItems: 0 })
  const [selectedUserId, setSelectedUserId] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState('all')
  const [messageForm, setMessageForm] = useState(initialMessageForm)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState({ type: '', message: '' })

  const loadMessages = async () => {
    const { data } = await api.get('/api/admin/messages')
    setThreads(data.threads || [])
    setSummary(data.summary || { totalThreads: 0, unreadThreads: 0, unreadItems: 0 })
    setSelectedUserId((current) => {
      if (data.threads?.some((thread) => thread.user?._id === current)) {
        return current
      }

      return data.threads?.[0]?.user?._id || ''
    })
  }

  useEffect(() => {
    loadMessages()
      .catch((error) => {
        setStatus({ type: 'error', message: extractApiError(error) })
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const filteredThreads = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()

    return threads.filter((thread) => {
      const matchesFilter = filter === 'all' || (filter === 'unread' && thread.unreadCount > 0)
      const matchesQuery =
        !query ||
        thread.user?.name?.toLowerCase().includes(query) ||
        thread.user?.email?.toLowerCase().includes(query) ||
        thread.latestSnippet?.toLowerCase().includes(query)

      return matchesFilter && matchesQuery
    })
  }, [filter, searchTerm, threads])

  const selectedThread = useMemo(
    () => filteredThreads.find((thread) => thread.user?._id === selectedUserId) || filteredThreads[0] || null,
    [filteredThreads, selectedUserId],
  )

  const handleMessageChange = (event) => {
    setMessageForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }))
  }

  const sendReply = async (event) => {
    event.preventDefault()

    if (!selectedThread?.user?._id) {
      return
    }

    setSending(true)
    setStatus({ type: '', message: '' })

    try {
      await api.post(`/api/admin/users/${selectedThread.user._id}/message`, messageForm)
      setMessageForm(initialMessageForm)
      await loadMessages()
      setSelectedUserId(selectedThread.user._id)
      setStatus({ type: 'success', message: 'Reply sent successfully.' })
    } catch (error) {
      setStatus({ type: 'error', message: extractApiError(error) })
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return <Loader message="Loading message inbox..." />
  }

  return (
    <div className="page-stack">
      <PageHeader
        description="Review user queries, pending document notes, payment proofs, and appointment requests from one admin inbox."
        eyebrow="Admin Inbox"
        title="Message Center"
      />

      <section className="admin-kpi-grid admin-kpi-grid-three">
        <article className="admin-kpi-card">
          <div className="admin-kpi-icon">
            <AdminIcon name="message" size={18} />
          </div>
          <span>Total Threads</span>
          <strong>{summary.totalThreads}</strong>
        </article>
        <article className="admin-kpi-card">
          <div className="admin-kpi-icon">
            <AdminIcon name="bell" size={18} />
          </div>
          <span>Unread Users</span>
          <strong>{summary.unreadThreads}</strong>
        </article>
        <article className="admin-kpi-card">
          <div className="admin-kpi-icon">
            <AdminIcon name="reply" size={18} />
          </div>
          <span>Open Alerts</span>
          <strong>{summary.unreadItems}</strong>
        </article>
      </section>

      {status.message ? <p className={`form-message ${status.type}`}>{status.message}</p> : null}

      <section className="admin-message-layout">
        <article className="admin-message-sidebar panel">
          <div className="admin-message-toolbar">
            <label className="admin-search-field">
              <AdminIcon name="search" size={16} />
              <input
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search client or message"
                type="text"
                value={searchTerm}
              />
            </label>
            <select onChange={(event) => setFilter(event.target.value)} value={filter}>
              <option value="all">All Threads</option>
              <option value="unread">Unread Only</option>
            </select>
          </div>

          {filteredThreads.length ? (
            <div className="admin-message-thread-list">
              {filteredThreads.map((thread) => (
                <button
                  className={`admin-message-thread ${selectedThread?.user?._id === thread.user?._id ? 'active' : ''}`}
                  key={thread.user?._id}
                  onClick={() => setSelectedUserId(thread.user?._id)}
                  type="button"
                >
                  <UserAvatar alt={`${thread.user?.name} profile`} className="admin-thread-avatar" user={thread.user} />
                  <div className="admin-thread-copy">
                    <div className="admin-thread-head">
                      <strong>{thread.user?.name}</strong>
                      {thread.unreadCount ? <span className="admin-notification-dot" /> : null}
                    </div>
                    <span>{thread.user?.email}</span>
                    <p>{thread.latestSnippet}</p>
                  </div>
                  <small>{formatDateTime(thread.latestAt)}</small>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState description="Try another search or switch back to all threads." title="No conversations found" />
          )}
        </article>

        <article className="admin-message-detail panel">
          {selectedThread ? (
            <>
              <div className="admin-message-detail-head">
                <div className="admin-message-user">
                  <UserAvatar alt={`${selectedThread.user?.name} profile`} className="admin-preview-avatar" user={selectedThread.user} />
                  <div>
                    <h3>{selectedThread.user?.name}</h3>
                    <p>{selectedThread.user?.email}</p>
                    <span>{selectedThread.user?.phone || 'No phone added'}</span>
                  </div>
                </div>
                <div className="admin-message-summary-pill">
                  <span>{selectedThread.unreadCount} open</span>
                </div>
              </div>

              <div className="admin-message-timeline">
                {selectedThread.items.length ? (
                  selectedThread.items.map((item) => (
                    <article
                      className={`admin-message-bubble ${item.direction === 'outbound' ? 'outbound' : 'inbound'}`}
                      key={item.id}
                    >
                      <div className="admin-message-bubble-head">
                        <span className="admin-message-type">{itemLabel(item.kind)}</span>
                        {item.needsAction ? <span className="admin-notification-dot" /> : null}
                        <small>{formatDateTime(item.createdAt)}</small>
                      </div>
                      <strong>{item.title}</strong>
                      <p>{item.message}</p>
                    </article>
                  ))
                ) : (
                  <EmptyState
                    description="This client has not sent any recent document notes or requests yet."
                    title="No recent client messages"
                  />
                )}
              </div>

              <form className="admin-reply-form" onSubmit={sendReply}>
                <h4>Reply to client</h4>
                <label>
                  Title
                  <input name="title" onChange={handleMessageChange} type="text" value={messageForm.title} />
                </label>
                <label>
                  Message
                  <textarea
                    name="message"
                    onChange={handleMessageChange}
                    placeholder="Write your response here"
                    required
                    rows="4"
                    value={messageForm.message}
                  />
                </label>
                <button className="button button-primary" disabled={sending} type="submit">
                  {sending ? 'Sending...' : 'Send Reply'}
                </button>
              </form>
            </>
          ) : (
            <EmptyState description="Select a conversation to review the full thread and reply." title="No thread selected" />
          )}
        </article>
      </section>
    </div>
  )
}

export default Messages
