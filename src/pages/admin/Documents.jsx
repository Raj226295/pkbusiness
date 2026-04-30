import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../../components/common/PageHeader.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import Loader from '../../components/common/Loader.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import UserAvatar from '../../components/common/UserAvatar.jsx'
import api, { extractApiError } from '../../lib/api.js'
import { downloadFileFromApi } from '../../lib/downloads.js'
import { formatDate, formatDateTime } from '../../lib/formatters.js'

function Documents() {
  const navigate = useNavigate()
  const { userId: routeUserId = '' } = useParams()
  const [documents, setDocuments] = useState([])
  const [folders, setFolders] = useState([])
  const [users, setUsers] = useState([])
  const [activeUserId, setActiveUserId] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [downloadingId, setDownloadingId] = useState('')
  const [deletingId, setDeletingId] = useState('')
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState({ type: '', message: '' })

  const filterLabels = {
    all: 'All Documents',
    pending: 'Needs Review',
    approved: 'Reviewed',
    rejected: 'Rejected',
  }

  const isFolderDetailPage = Boolean(routeUserId)

  const loadData = async () => {
    const [{ data: documentsData }, { data: usersData }] = await Promise.all([
      api.get('/api/admin/documents'),
      api.get('/api/admin/users'),
    ])

    const clientUsers = (usersData.users || []).filter((user) => user.role !== 'admin')
    setDocuments(documentsData.documents || [])
    setFolders(documentsData.folders || [])
    setUsers(clientUsers)
    setActiveUserId((current) => {
      if (routeUserId && clientUsers.some((user) => user._id === routeUserId)) {
        return routeUserId
      }

      if (clientUsers.some((user) => user._id === current)) {
        return current
      }

      return clientUsers[0]?._id || ''
    })
  }

  useEffect(() => {
    loadData()
      .catch((error) => {
        setStatus({ type: 'error', message: extractApiError(error) })
      })
      .finally(() => {
        setLoading(false)
      })
  }, [routeUserId])

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
    () => folderCards.find((folder) => folder.userId === activeUserId) || null,
    [activeUserId, folderCards],
  )

  useEffect(() => {
    if (!routeUserId) {
      return
    }

    if (folderCards.some((folder) => folder.userId === routeUserId)) {
      setActiveUserId(routeUserId)
    }
  }, [folderCards, routeUserId])

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

  const handleDelete = async (document) => {
    if (!window.confirm(`Delete ${document.originalName || document.filename}? This action cannot be undone.`)) {
      return
    }

    setDeletingId(document._id)

    try {
      await api.delete(`/api/admin/documents/${document._id}`)
      await loadData()
      setStatus({
        type: 'success',
        message: `${document.originalName || document.filename} deleted successfully.`,
      })
    } catch (error) {
      setStatus({ type: 'error', message: extractApiError(error) })
    } finally {
      setDeletingId('')
    }
  }

  if (loading) {
    return <Loader message="Loading client folders..." />
  }

  if (isFolderDetailPage && !activeFolder) {
    return (
      <div className="page-stack">
        <PageHeader
          description="The selected folder could not be found."
          eyebrow="My Folder"
          title="Folder Not Found"
        />
        <button className="button button-ghost button-compact" onClick={() => navigate('/admin/folders')} type="button">
          Back To Folders
        </button>
        <EmptyState
          description="Please go back to the folder list and choose a valid client folder."
          title="Folder not available"
        />
      </div>
    )
  }

  return (
    <div className="page-stack">
      <PageHeader
        description={
          isFolderDetailPage
            ? 'Preview, share, download, and delete files from this dedicated client folder.'
            : 'Tap any folder card to open that client folder on a new page.'
        }
        eyebrow="My Folder"
        title={isFolderDetailPage && activeFolder ? `${activeFolder.user.name} Folder` : 'Client Folders'}
      />

      {status.message ? <p className={`form-message ${status.type}`}>{status.message}</p> : null}

      {!isFolderDetailPage ? (
        folderCards.length ? (
          <section className="admin-folder-grid">
            {folderCards.map((folder) => (
              <button
                className="admin-folder-card"
                key={folder.userId}
                onClick={() => navigate(`/admin/folders/${folder.userId}`)}
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
                  <span>{folder.pendingCount} updates</span>
                </div>
                <small>
                  {folder.lastUploadDate ? `Last upload ${formatDate(folder.lastUploadDate)}` : 'Folder ready for first file'}
                </small>
              </button>
            ))}
          </section>
        ) : (
          <EmptyState
            description="User-wise folders will appear here automatically as soon as client accounts are added."
            title="No folders yet"
          />
        )
      ) : (
        <>
          <button className="button button-ghost button-compact" onClick={() => navigate('/admin/folders')} type="button">
            Back To Folders
          </button>

          <section className="panel admin-folder-detail">
            <div className="admin-folder-detail-head">
              <div>
                <span className="admin-surface-eyebrow">Selected Folder</span>
                <h3>{activeFolder.user.name}</h3>
                <p>{activeFolder.user.email}</p>
              </div>

              <div className="admin-folder-filter-row">
                <div className="admin-folder-summary-pill">{activeFolder.totalFiles} total files</div>
                <select onChange={(event) => setStatusFilter(event.target.value)} value={statusFilter}>
                  <option value="all">{filterLabels.all}</option>
                  <option value="pending">{filterLabels.pending}</option>
                  <option value="approved">{filterLabels.approved}</option>
                  <option value="rejected">{filterLabels.rejected}</option>
                </select>
              </div>
            </div>

            <div className="admin-preview-metric-grid">
              <article className="admin-preview-metric">
                <span>Total Files</span>
                <strong>{activeFolder.totalFiles}</strong>
              </article>
              <article className="admin-preview-metric">
                <span>Needs Review</span>
                <strong>{activeFolder.pendingCount}</strong>
              </article>
              <article className="admin-preview-metric">
                <span>Reviewed</span>
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
                      <div className="admin-meta-row">
                        <span>
                          {document.uploadedBy?.role === 'admin'
                            ? `Shared by ${document.uploadedBy.name}`
                            : 'Submitted by user'}
                        </span>
                        <span>{document.reviewedAt ? `Reviewed ${formatDateTime(document.reviewedAt)}` : 'Not reviewed yet'}</span>
                      </div>
                      {document.notes ? <p className="admin-client-note">Note: {document.notes}</p> : null}
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
                      <button
                        className="button button-danger button-compact"
                        disabled={deletingId === document._id}
                        onClick={() => handleDelete(document)}
                        type="button"
                      >
                        {deletingId === document._id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState
                description={
                  statusFilter === 'all'
                    ? 'This folder is ready. Add the first file from the form above.'
                    : `No ${filterLabels[statusFilter] || 'matching'} documents were found in this folder.`
                }
                title="No files to show"
              />
            )}
          </section>
        </>
      )}
    </div>
  )
}

export default Documents
