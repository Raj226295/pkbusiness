import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import PageHeader from '../../components/common/PageHeader.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import Loader from '../../components/common/Loader.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import UserAvatar from '../../components/common/UserAvatar.jsx'
import api, { extractApiError } from '../../lib/api.js'
import { downloadFileFromApi } from '../../lib/downloads.js'
import { formatDate, formatDateTime } from '../../lib/formatters.js'

function Documents() {
  const [searchParams] = useSearchParams()
  const [documents, setDocuments] = useState([])
  const [folders, setFolders] = useState([])
  const [users, setUsers] = useState([])
  const [activeUserId, setActiveUserId] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [downloadingId, setDownloadingId] = useState('')
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState({ type: '', message: '' })

  const loadData = async () => {
    const [{ data: documentsData }, { data: usersData }] = await Promise.all([
      api.get('/api/admin/documents'),
      api.get('/api/admin/users'),
    ])

    const clientUsers = (usersData.users || []).filter((user) => user.role !== 'admin')
    setDocuments(documentsData.documents || [])
    setFolders(documentsData.folders || [])
    setUsers(clientUsers)
    setActiveUserId((current) => (clientUsers.some((user) => user._id === current) ? current : clientUsers[0]?._id || ''))
  }

  useEffect(() => {
    loadData()
      .catch((error) => {
        setStatus({ type: 'error', message: extractApiError(error) })
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const folderCards = useMemo(() => {
    const userLookup = new Map(users.map((user) => [user._id, user]))

    return folders
      .map((folder) => {
        const user = userLookup.get(folder.userId)

        if (!user) {
          return null
        }

        return {
          userId: folder.userId,
          user,
          totalFiles: folder.documentCount || 0,
          pendingCount: folder.pendingCount || 0,
          approvedCount: folder.approvedCount || 0,
          rejectedCount: folder.rejectedCount || 0,
          lastUploadDate: folder.lastSubmittedAt || '',
        }
      })
      .filter(Boolean)
      .sort((left, right) => {
        if (!left.lastUploadDate && !right.lastUploadDate) return left.user.name.localeCompare(right.user.name)
        if (!left.lastUploadDate) return 1
        if (!right.lastUploadDate) return -1
        return new Date(right.lastUploadDate) - new Date(left.lastUploadDate)
      })
  }, [folders, users])

  const activeFolder = useMemo(
    () => folderCards.find((folder) => folder.userId === activeUserId) || folderCards[0] || null,
    [activeUserId, folderCards],
  )

  useEffect(() => {
    const requestedUserId = searchParams.get('userId')

    if (!requestedUserId) {
      return
    }

    if (folderCards.some((folder) => folder.userId === requestedUserId)) {
      setActiveUserId(requestedUserId)
    }
  }, [folderCards, searchParams])

  const activeDocuments = useMemo(() => {
    return documents.filter((document) => {
      const matchesUser = document.user?._id === activeFolder?.userId
      const matchesStatus = statusFilter === 'all' || document.status === statusFilter
      return matchesUser && matchesStatus
    })
  }, [activeFolder, documents, statusFilter])

  const handleDownload = async (document) => {
    setDownloadingId(document._id)

    try {
      await downloadFileFromApi(document.downloadUrl, document.originalName || document.filename)
    } catch (error) {
      setStatus({ type: 'error', message: extractApiError(error) })
    } finally {
      setDownloadingId('')
    }
  }

  if (loading) {
    return <Loader message="Loading client folders..." />
  }

  return (
    <div className="page-stack">
      <PageHeader
        description="Open user-wise document folders, review every uploaded file, and preview or download the records you need."
        eyebrow="My Folder"
        title="Client Folders"
      />

      {status.message ? <p className={`form-message ${status.type}`}>{status.message}</p> : null}

      <section className="admin-folder-grid">
        {folderCards.map((folder) => (
          <button
            className={`admin-folder-card ${activeFolder?.userId === folder.userId ? 'active' : ''}`}
            key={folder.userId}
            onClick={() => setActiveUserId(folder.userId)}
            type="button"
          >
            <div className="admin-folder-card-head">
              <UserAvatar alt={`${folder.user.name} profile`} className="admin-folder-avatar" user={folder.user} />
              <div>
                <strong>{folder.user.name}</strong>
                <span>{folder.user.name} Folder</span>
                <span>{folder.user.email}</span>
              </div>
            </div>
            <div className="admin-folder-card-stats">
              <span>{folder.totalFiles} files</span>
              <span>{folder.pendingCount} pending</span>
            </div>
            <small>
              {folder.lastUploadDate ? `Last upload ${formatDate(folder.lastUploadDate)}` : 'No uploads yet'}
            </small>
          </button>
        ))}
      </section>

      <section className="panel admin-folder-detail">
        {activeFolder ? (
          <>
            <div className="admin-folder-detail-head">
              <div>
                <span className="admin-surface-eyebrow">Selected Folder</span>
                <h3>{activeFolder.user.name}</h3>
                <p>{activeFolder.user.email}</p>
              </div>

              <div className="admin-folder-filter-row">
                <div className="admin-folder-summary-pill">{activeFolder.totalFiles} total files</div>
                <select onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
                  <option value="all">All Documents</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>

            <div className="admin-preview-metric-grid">
              <article className="admin-preview-metric">
                <span>Total Files</span>
                <strong>{activeFolder.totalFiles}</strong>
              </article>
              <article className="admin-preview-metric">
                <span>Pending</span>
                <strong>{activeFolder.pendingCount}</strong>
              </article>
              <article className="admin-preview-metric">
                <span>Approved</span>
                <strong>{activeFolder.approvedCount}</strong>
              </article>
              <article className="admin-preview-metric">
                <span>Last Upload</span>
                <strong>{activeFolder.lastUploadDate ? formatDate(activeFolder.lastUploadDate) : 'N/A'}</strong>
              </article>
            </div>

            {activeDocuments.length ? (
              <div className="admin-folder-file-list">
                {activeDocuments.map((document) => (
                  <article className="admin-folder-file-row" key={document._id}>
                    <div>
                      <div className="admin-record-title-row">
                        <strong>{document.documentType || document.title}</strong>
                        <StatusBadge status={document.status} />
                      </div>
                      <p>{document.originalName || document.filename}</p>
                      <div className="admin-meta-row">
                        <span>Service: {document.serviceType}</span>
                        <span>Uploaded: {formatDateTime(document.createdAt)}</span>
                      </div>
                    </div>

                    <div className="admin-record-actions">
                      <button
                        className="button button-primary button-compact"
                        disabled={downloadingId === document._id}
                        onClick={() => handleDownload(document)}
                        type="button"
                      >
                        {downloadingId === document._id ? 'Downloading...' : 'Download'}
                      </button>
                      {document.fileUrl ? (
                        <a className="button button-ghost button-compact" href={document.fileUrl} rel="noreferrer" target="_blank">
                          Preview
                        </a>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                description={
                  statusFilter === 'all'
                    ? 'This client has not uploaded any documents yet.'
                    : `No ${statusFilter} documents were found in this folder.`
                }
                title="No files to show"
              />
            )}
          </>
        ) : (
          <EmptyState
            description="User-wise folders will appear here automatically as soon as clients start uploading service documents."
            title="No folders yet"
          />
        )}
      </section>
    </div>
  )
}

export default Documents
