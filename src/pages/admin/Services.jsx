import { useEffect, useMemo, useRef, useState } from 'react'
import EmptyState from '../../components/common/EmptyState.jsx'
import Loader from '../../components/common/Loader.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import UserAvatar from '../../components/common/UserAvatar.jsx'
import api, { extractApiError } from '../../lib/api.js'
import { downloadFileFromApi } from '../../lib/downloads.js'
import { formatCurrency, formatDateTime } from '../../lib/formatters.js'
import { resolveUploadUrl } from '../../lib/uploads.js'

const coreServices = [
  'Income Tax Filing',
  'GST Registration & Return',
  'Audit Services',
  'Accounting / Bookkeeping',
  'Company Registration',
  'Food License',
]

const initialCatalogForm = {
  name: '',
  description: '',
  price: '0',
  isActive: true,
}

const defaultServiceImageSettings = {
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
}

function createCatalogForm(item = null) {
  if (!item) {
    return initialCatalogForm
  }

  return {
    name: item.name || '',
    description: item.description || '',
    price: String(item.price ?? 0),
    isActive: item.isActive !== false,
  }
}

function getSuggestedServiceStatus(assignment, documents = []) {
  if (assignment?.status) {
    return assignment.status
  }

  if (!documents.length) {
    return 'pending'
  }

  if (documents.some((document) => document.status === 'rejected')) {
    return 'rejected'
  }

  if (documents.every((document) => document.status === 'approved')) {
    return 'approved'
  }

  return 'pending'
}

function formatServiceDecisionLabel(status = '') {
  switch (status) {
    case 'pending':
      return 'Needs review'
    case 'approved':
      return 'Approved'
    case 'rejected':
      return 'Rejected'
    case 'in progress':
      return 'In progress'
    case 'completed':
      return 'Completed'
    default:
      return 'No decision yet'
  }
}

function Services() {
  const editorSectionRef = useRef(null)
  const serviceNameInputRef = useRef(null)
  const [activeWorkspace, setActiveWorkspace] = useState('catalog')
  const [documents, setDocuments] = useState([])
  const [services, setServices] = useState([])
  const [catalog, setCatalog] = useState([])
  const [users, setUsers] = useState([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedServiceName, setSelectedServiceName] = useState(coreServices[0])
  const [documentDrafts, setDocumentDrafts] = useState({})
  const [serviceDrafts, setServiceDrafts] = useState({})
  const [selectedCatalogId, setSelectedCatalogId] = useState('')
  const [isCreatingCatalogItem, setIsCreatingCatalogItem] = useState(false)
  const [catalogForm, setCatalogForm] = useState(initialCatalogForm)
  const [catalogImage, setCatalogImage] = useState(null)
  const [catalogImagePreviewUrl, setCatalogImagePreviewUrl] = useState('')
  const [catalogImageSettings, setCatalogImageSettings] = useState(defaultServiceImageSettings)
  const [catalogImageInputKey, setCatalogImageInputKey] = useState(0)
  const [savingKey, setSavingKey] = useState('')
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState({ type: '', message: '' })

  const loadData = async () => {
    const [{ data: servicesData }, { data: documentsData }, { data: usersData }] = await Promise.all([
      api.get('/api/admin/services'),
      api.get('/api/admin/documents'),
      api.get('/api/admin/users'),
    ])

    const clientUsers = (usersData.users || []).filter((user) => user.role !== 'admin')
    setServices(servicesData.services || [])
    setCatalog(servicesData.catalog || [])
    setDocuments(documentsData.documents || [])
    setUsers(clientUsers)
    setSelectedUserId((current) => (clientUsers.some((user) => user._id === current) ? current : clientUsers[0]?._id || ''))
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

  const selectedCatalogItem = useMemo(
    () => catalog.find((item) => item._id === selectedCatalogId) || null,
    [catalog, selectedCatalogId],
  )

  useEffect(() => {
    if (!catalog.length) {
      if (!isCreatingCatalogItem) {
        setSelectedCatalogId('')
        setCatalogForm(initialCatalogForm)
      }
      return
    }

    if (isCreatingCatalogItem) {
      return
    }

    const selectedItem = catalog.find((item) => item._id === selectedCatalogId)

    if (selectedItem) {
      setCatalogForm(createCatalogForm(selectedItem))
      return
    }

    setSelectedCatalogId(catalog[0]._id)
    setCatalogForm(createCatalogForm(catalog[0]))
  }, [catalog, isCreatingCatalogItem, selectedCatalogId])

  useEffect(() => {
    if (isCreatingCatalogItem) {
      setCatalogImage(null)
      setCatalogImagePreviewUrl('')
      setCatalogImageSettings(defaultServiceImageSettings)
      setCatalogImageInputKey((current) => current + 1)
      return
    }

    if (!selectedCatalogItem) {
      return
    }

    setCatalogImage(null)
    setCatalogImagePreviewUrl('')
    setCatalogImageSettings({
      zoom: selectedCatalogItem.imageZoom ?? 1,
      offsetX: selectedCatalogItem.imageOffsetX ?? 0,
      offsetY: selectedCatalogItem.imageOffsetY ?? 0,
    })
    setCatalogImageInputKey((current) => current + 1)
  }, [isCreatingCatalogItem, selectedCatalogItem])

  useEffect(() => {
    if (!catalogImage) {
      setCatalogImagePreviewUrl('')
      return
    }

    const nextPreviewUrl = URL.createObjectURL(catalogImage)
    setCatalogImagePreviewUrl(nextPreviewUrl)

    return () => {
      URL.revokeObjectURL(nextPreviewUrl)
    }
  }, [catalogImage])

  const activeCatalogImageUrl = useMemo(
    () => catalogImagePreviewUrl || resolveUploadUrl(selectedCatalogItem?.image),
    [catalogImagePreviewUrl, selectedCatalogItem?.image],
  )

  const activeCatalogImageStyle = useMemo(
    () => ({
      objectPosition: `${50 + Number(catalogImageSettings.offsetX || 0)}% ${50 + Number(catalogImageSettings.offsetY || 0)}%`,
      transform: `scale(${Number(catalogImageSettings.zoom || 1)})`,
    }),
    [catalogImageSettings.offsetX, catalogImageSettings.offsetY, catalogImageSettings.zoom],
  )

  const serviceNames = useMemo(() => {
    const names = new Set(coreServices)
    catalog.forEach((item) => names.add(item.name))
    services.forEach((service) => names.add(service.type))
    documents.forEach((document) => names.add(document.serviceType))
    return Array.from(names)
  }, [catalog, documents, services])

  const selectedUser = useMemo(
    () => users.find((user) => user._id === selectedUserId) || users[0] || null,
    [selectedUserId, users],
  )

  const catalogCards = useMemo(
    () =>
      catalog.map((item) => {
        const matchingAssignments = services.filter(
          (service) => service.catalogService?._id === item._id || service.type === item.name,
        )
        const clientCount = new Set(matchingAssignments.map((service) => service.user?._id).filter(Boolean)).size

        return {
          ...item,
          assignmentCount: matchingAssignments.length,
          clientCount,
        }
      }),
    [catalog, services],
  )

  const catalogSummary = useMemo(
    () => ({
      total: catalogCards.length,
      active: catalogCards.filter((item) => item.isActive).length,
      hidden: catalogCards.filter((item) => !item.isActive).length,
      assigned: services.length,
    }),
    [catalogCards, services.length],
  )

  const serviceCards = useMemo(() => {
    return serviceNames.map((serviceName) => {
      const serviceDocuments = documents.filter(
        (document) => document.user?._id === selectedUser?._id && document.serviceType === serviceName,
      )
      const assignment = services.find(
        (service) => service.user?._id === selectedUser?._id && service.type === serviceName,
      )

      return {
        serviceName,
        documents: serviceDocuments,
        assignment,
        latestUpload: serviceDocuments[0]?.createdAt || '',
      }
    })
  }, [documents, selectedUser?._id, serviceNames, services])

  const activeService = useMemo(
    () => serviceCards.find((service) => service.serviceName === selectedServiceName) || serviceCards[0] || null,
    [selectedServiceName, serviceCards],
  )

  const activeServiceDraft = useMemo(() => {
    if (!activeService) {
      return null
    }

    return serviceDrafts[activeService.serviceName] || {
      description:
        activeService.assignment?.description ||
        catalog.find((item) => item.name === activeService.serviceName)?.description ||
        '',
      price: activeService.assignment?.price || 0,
      status: getSuggestedServiceStatus(activeService.assignment, activeService.documents),
      priority: activeService.assignment?.priority || 'medium',
      adminRemarks: activeService.assignment?.adminRemarks || '',
      notes: activeService.assignment?.notes || '',
    }
  }, [activeService, catalog, serviceDrafts])

  const activeServiceReview = useMemo(() => {
    if (!activeService) {
      return { total: 0, approved: 0, rejected: 0, pending: 0, readyForPayment: false }
    }

    const total = activeService.documents.length
    const approved = activeService.documents.filter((document) => document.status === 'approved').length
    const rejected = activeService.documents.filter((document) => document.status === 'rejected').length
    const pending = activeService.documents.filter((document) => document.status === 'pending').length
    const readyForPayment = total > 0 && approved === total && rejected === 0 && pending === 0

    return { total, approved, rejected, pending, readyForPayment }
  }, [activeService])

  const handleSelectCatalogItem = (item) => {
    setActiveWorkspace('catalog')
    setIsCreatingCatalogItem(false)
    setSelectedCatalogId(item._id)
    setCatalogForm(createCatalogForm(item))
  }

  const handleStartNewCatalogItem = () => {
    setActiveWorkspace('catalog')
    setIsCreatingCatalogItem(true)
    setSelectedCatalogId('')
    setCatalogForm(initialCatalogForm)
    window.setTimeout(() => {
      editorSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      serviceNameInputRef.current?.focus()
    }, 80)
  }

  const handleCatalogFormChange = (event) => {
    const { name, value, type, checked } = event.target

    setCatalogForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleCatalogImageChange = (event) => {
    setCatalogImage(event.target.files?.[0] || null)
  }

  const handleCatalogImageSettingChange = (event) => {
    const { name, value } = event.target

    setCatalogImageSettings((current) => ({
      ...current,
      [name]: Number(value),
    }))
  }

  const handleSetCatalogImage = () => {
    if (!catalogImage && !selectedCatalogItem?.image) {
      setStatus({ type: 'error', message: 'Please choose a service image first.' })
      return
    }

    setStatus({
      type: 'success',
      message: 'Image set. Ab niche service details complete karke save kar sakte ho.',
    })
    serviceNameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    serviceNameInputRef.current?.focus()
  }

  const saveCatalogItem = async (event) => {
    event.preventDefault()
    setSavingKey('catalog-form')

    const payload = new FormData()
    payload.append('name', catalogForm.name.trim())
    payload.append('description', catalogForm.description.trim())
    payload.append('price', String(Number(catalogForm.price || 0)))
    payload.append('isActive', String(catalogForm.isActive))
    payload.append('imageZoom', String(catalogImageSettings.zoom))
    payload.append('imageOffsetX', String(catalogImageSettings.offsetX))
    payload.append('imageOffsetY', String(catalogImageSettings.offsetY))

    if (catalogImage) {
      payload.append('serviceImage', catalogImage)
    }

    try {
      if (selectedCatalogItem && !isCreatingCatalogItem) {
        const { data } = await api.patch(`/api/admin/service-catalog/${selectedCatalogItem._id}`, payload, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })
        setCatalogForm(createCatalogForm(data.service))
        setCatalogImage(null)
        setCatalogImageInputKey((current) => current + 1)
        await loadData()
        setStatus({ type: 'success', message: 'Service updated successfully.' })
      } else {
        const { data } = await api.post('/api/admin/service-catalog', payload, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        })
        setIsCreatingCatalogItem(false)
        setSelectedCatalogId(data.service?._id || '')
        setCatalogForm(createCatalogForm(data.service))
        setCatalogImage(null)
        setCatalogImageInputKey((current) => current + 1)
        await loadData()
        setStatus({ type: 'success', message: 'New service added successfully.' })
      }
    } catch (error) {
      setStatus({ type: 'error', message: extractApiError(error) })
    } finally {
      setSavingKey('')
    }
  }

  const deleteCatalogItem = async () => {
    if (!selectedCatalogItem) {
      return
    }

    if (!window.confirm(`Delete ${selectedCatalogItem.name}?`)) {
      return
    }

    setSavingKey('catalog-delete')

    try {
      await api.delete(`/api/admin/service-catalog/${selectedCatalogItem._id}`)
      setIsCreatingCatalogItem(false)
      setSelectedCatalogId('')
      setCatalogForm(initialCatalogForm)
      await loadData()
      setStatus({ type: 'success', message: 'Service deleted successfully.' })
    } catch (error) {
      setStatus({ type: 'error', message: extractApiError(error) })
    } finally {
      setSavingKey('')
    }
  }

  const saveDocumentReview = async (documentRecord) => {
    const draft = documentDrafts[documentRecord._id] || {
      status: documentRecord.status,
      remarks: documentRecord.remarks || '',
    }

    setSavingKey(documentRecord._id)

    try {
      await api.patch(`/api/admin/documents/${documentRecord._id}`, draft)
      await loadData()
      setStatus({ type: 'success', message: 'Service document updated successfully.' })
    } catch (error) {
      setStatus({ type: 'error', message: extractApiError(error) })
    } finally {
      setSavingKey('')
    }
  }

  const saveServiceAssignment = async () => {
    if (!selectedUser || !activeService || !activeServiceDraft) {
      return
    }

    setSavingKey(`service-${activeService.serviceName}`)

    const matchingCatalogItem = catalog.find((item) => item.name === activeService.serviceName)
    const payload = {
      userId: selectedUser._id,
      catalogServiceId: matchingCatalogItem?._id || '',
      type: activeService.serviceName,
      description: activeServiceDraft.description,
      price: Number(activeServiceDraft.price || 0),
      status: activeServiceDraft.status,
      priority: activeServiceDraft.priority,
      adminRemarks: activeServiceDraft.adminRemarks,
      notes: activeServiceDraft.notes,
      requestedByClient: false,
    }

    try {
      if (activeService.assignment?._id) {
        await api.patch(`/api/admin/services/${activeService.assignment._id}`, payload)
      } else {
        await api.post('/api/admin/services', payload)
      }

      await loadData()
      setStatus({ type: 'success', message: 'Client service pricing updated successfully.' })
    } catch (error) {
      setStatus({ type: 'error', message: extractApiError(error) })
    } finally {
      setSavingKey('')
    }
  }

  const renderCatalogWorkspace = () => (
    <section className="admin-services-hub">
      <article className="panel admin-service-catalog-panel">
        <div className="admin-table-head">
          <div>
            <span className="admin-surface-eyebrow">Available Services</span>
            <h3>Control the service catalog</h3>
            <p>Yahin se decide hoga kaun si services live hain, kis price se start hoti hain, aur kaun si hidden rahengi.</p>
          </div>
        </div>

        <div className="document-summary-grid admin-service-catalog-summary">
          <div className="document-stat-tile">
            <strong>{catalogSummary.total}</strong>
            <span>Total services</span>
          </div>
          <div className="document-stat-tile">
            <strong>{catalogSummary.active}</strong>
            <span>Live for users</span>
          </div>
          <div className="document-stat-tile">
            <strong>{catalogSummary.hidden}</strong>
            <span>Hidden services</span>
          </div>
          <div className="document-stat-tile">
            <strong>{catalogSummary.assigned}</strong>
            <span>Client assignments</span>
          </div>
        </div>

        {catalogCards.length ? (
          <div className="admin-service-catalog-list">
            {catalogCards.map((item) => (
              <button
                className={`admin-service-catalog-card ${selectedCatalogId === item._id && !isCreatingCatalogItem ? 'active' : ''}`}
                key={item._id}
                onClick={() => handleSelectCatalogItem(item)}
                type="button"
              >
                {item.image ? (
                  <div className="admin-service-catalog-thumb">
                    <img
                      alt={`${item.name} preview`}
                      src={resolveUploadUrl(item.image)}
                      style={{
                        objectPosition: `${50 + Number(item.imageOffsetX || 0)}% ${50 + Number(item.imageOffsetY || 0)}%`,
                        transform: `scale(${Number(item.imageZoom || 1)})`,
                      }}
                    />
                  </div>
                ) : null}
                <div className="admin-service-catalog-card-head">
                  <strong>{item.name}</strong>
                  <span className={`admin-availability-chip ${item.isActive ? 'active' : 'inactive'}`}>
                    {item.isActive ? 'Live' : 'Hidden'}
                  </span>
                </div>
                <p>{item.description || 'No service description added yet.'}</p>
                <div className="admin-service-catalog-card-meta">
                  <span>{formatCurrency(item.price || 0)}</span>
                  <span>{item.clientCount} clients</span>
                  <span>{item.assignmentCount} assignments</span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState
            description="Abhi service catalog empty hai. Pehla service add karke user-side availability define karein."
            title="No services added"
          />
        )}
      </article>

      <article className="panel admin-service-editor-panel" ref={editorSectionRef}>
        <div className="admin-table-head">
          <div>
            <span className="admin-surface-eyebrow">{isCreatingCatalogItem ? 'New Service' : 'Edit Service'}</span>
            <h3>{isCreatingCatalogItem ? 'Add a fresh service' : selectedCatalogItem?.name || 'Select a service'}</h3>
            <p>Base price aur visibility set karein. Active services user-side service list me show hongi.</p>
          </div>
        </div>

        <form className="admin-service-editor-form" onSubmit={saveCatalogItem}>
          <div className="admin-service-image-stage">
            <div className="admin-service-image-preview">
              {activeCatalogImageUrl ? (
                <img alt={`${catalogForm.name || selectedCatalogItem?.name || 'Service'} artwork preview`} src={activeCatalogImageUrl} style={activeCatalogImageStyle} />
              ) : (
                <div className="admin-service-image-empty">
                  <strong>No service image</strong>
                  <span>Upload artwork for this service card</span>
                </div>
              )}
            </div>

            <div className="profile-image-editor admin-service-image-editor">
              <label>
                Service image
                <input
                  accept="image/*"
                  key={catalogImageInputKey}
                  name="serviceImage"
                  onChange={handleCatalogImageChange}
                  type="file"
                />
              </label>

              <div className="range-control">
                <div className="range-control-head">
                  <strong>Zoom</strong>
                  <span>{catalogImageSettings.zoom.toFixed(2)}x</span>
                </div>
                <input
                  max="2.5"
                  min="1"
                  name="zoom"
                  onChange={handleCatalogImageSettingChange}
                  step="0.05"
                  type="range"
                  value={catalogImageSettings.zoom}
                />
              </div>

              <div className="range-control">
                <div className="range-control-head">
                  <strong>Left / Right</strong>
                  <span>{catalogImageSettings.offsetX}%</span>
                </div>
                <input
                  max="35"
                  min="-35"
                  name="offsetX"
                  onChange={handleCatalogImageSettingChange}
                  step="1"
                  type="range"
                  value={catalogImageSettings.offsetX}
                />
              </div>

              <div className="range-control">
                <div className="range-control-head">
                  <strong>Up / Down</strong>
                  <span>{catalogImageSettings.offsetY}%</span>
                </div>
                <input
                  max="35"
                  min="-35"
                  name="offsetY"
                  onChange={handleCatalogImageSettingChange}
                  step="1"
                  type="range"
                  value={catalogImageSettings.offsetY}
                />
              </div>

              <button className="button button-secondary" onClick={handleSetCatalogImage} type="button">
                Set Image
              </button>
            </div>
          </div>

          <label>
            Service name
            <input
              ref={serviceNameInputRef}
              name="name"
              onChange={handleCatalogFormChange}
              placeholder="For example: MSME Registration"
              required
              type="text"
              value={catalogForm.name}
            />
          </label>

          <label>
            Description
            <textarea
              name="description"
              onChange={handleCatalogFormChange}
              placeholder="Short explanation shown in service cards"
              rows="4"
              value={catalogForm.description}
            />
          </label>

          <div className="admin-inline-editor admin-service-editor-inline">
            <label>
              Base price
              <input
                min="0"
                name="price"
                onChange={handleCatalogFormChange}
                required
                type="number"
                value={catalogForm.price}
              />
            </label>
            <label className="admin-toggle-field">
              <span>Visible to users</span>
              <input checked={catalogForm.isActive} name="isActive" onChange={handleCatalogFormChange} type="checkbox" />
            </label>
          </div>

          <div className="admin-service-editor-actions">
            <button className="button button-primary" disabled={savingKey === 'catalog-form'} type="submit">
              {savingKey === 'catalog-form'
                ? 'Saving...'
                : isCreatingCatalogItem || !selectedCatalogItem
                  ? 'Add Service'
                  : 'Update Service'}
            </button>
            {selectedCatalogItem && !isCreatingCatalogItem ? (
              <button
                className="admin-grid-button delete admin-service-delete-button"
                disabled={savingKey === 'catalog-delete'}
                onClick={deleteCatalogItem}
                type="button"
              >
                {savingKey === 'catalog-delete' ? 'Deleting...' : 'Delete Service'}
              </button>
            ) : null}
          </div>
        </form>
      </article>
    </section>
  )

  const renderReviewWorkspace = () => (
    <section className="page-stack admin-service-review-workspace">
      <section className="admin-client-strip">
        {users.map((user) => (
          <button
            className={`admin-client-pill ${selectedUser?._id === user._id ? 'active' : ''}`}
            key={user._id}
            onClick={() => setSelectedUserId(user._id)}
            type="button"
          >
            <UserAvatar alt={`${user.name} profile`} className="admin-folder-avatar" user={user} />
            <div>
              <strong>{user.name}</strong>
              <span>{user.email}</span>
            </div>
          </button>
        ))}
      </section>

      <section className="admin-service-card-grid">
        {serviceCards.map((service) => (
          <button
            className={`admin-service-card ${activeService?.serviceName === service.serviceName ? 'active' : ''}`}
            key={service.serviceName}
            onClick={() => setSelectedServiceName(service.serviceName)}
            type="button"
          >
            <div className="admin-service-card-head">
              <strong>{service.serviceName}</strong>
              {service.documents.length ? <span className="admin-notification-dot" /> : null}
            </div>
            <p>{service.assignment?.description || 'Professional CA support and document handling.'}</p>
            <div className="admin-service-card-meta">
              <span>{service.documents.length} files</span>
              <span>{formatServiceDecisionLabel(service.assignment?.status)}</span>
              <span>{service.latestUpload ? formatDateTime(service.latestUpload) : 'No upload yet'}</span>
            </div>
          </button>
        ))}
      </section>

      <section className="panel admin-service-detail">
        {selectedUser && activeService ? (
          <>
            <div className="admin-folder-detail-head">
              <div>
                <span className="admin-surface-eyebrow">Client Pricing</span>
                <h3>
                  {activeService.serviceName} for {selectedUser.name}
                </h3>
                <p>{selectedUser.email}</p>
              </div>

              {activeService.assignment ? (
                <div className="admin-service-summary">
                  <StatusBadge status={activeService.assignment.status} />
                  <span>{formatCurrency(activeService.assignment.price || 0)}</span>
                </div>
              ) : (
                <div className="admin-service-summary muted">No client assignment record yet</div>
              )}
            </div>

            {activeService.assignment?.notes ? (
              <p className="admin-client-note">Client note: {activeService.assignment.notes}</p>
            ) : null}

            <div className="card-grid two-up">
              <article className="admin-subpanel">
                <div className="admin-subpanel-head">
                  <h4>Document review status</h4>
                  <span className="admin-muted-text">
                    {activeServiceReview.readyForPayment
                      ? 'Documents are ready for service approval'
                      : 'Review required before service approval'}
                  </span>
                </div>
                <div className="document-summary-grid">
                  <div className="document-stat-tile">
                    <strong>{activeServiceReview.total}</strong>
                    <span>Total files</span>
                  </div>
                  <div className="document-stat-tile">
                    <strong>{activeServiceReview.approved}</strong>
                    <span>Approved</span>
                  </div>
                  <div className="document-stat-tile">
                    <strong>{activeServiceReview.pending}</strong>
                    <span>Needs review</span>
                  </div>
                  <div className="document-stat-tile">
                    <strong>{activeServiceReview.rejected}</strong>
                    <span>Rejected</span>
                  </div>
                </div>
                <p className="admin-muted-text">
                  User dashboard me payment tabhi show hoga jab saare documents approved hon, service approved ho, aur yahan final price set ho.
                </p>
              </article>

              <article className="admin-subpanel">
                <div className="admin-subpanel-head">
                  <h4>Client service decision</h4>
                  <span className="admin-muted-text">
                    {activeService.assignment ? 'Update current assignment' : 'Create client assignment'}
                  </span>
                </div>
                <div className="admin-inline-editor admin-inline-editor-wrap">
                  <label>
                    Final price
                    <input
                      min="0"
                      onChange={(event) =>
                        setServiceDrafts((current) => ({
                          ...current,
                          [activeService.serviceName]: {
                            ...activeServiceDraft,
                            price: event.target.value,
                          },
                        }))
                      }
                      type="number"
                      value={activeServiceDraft?.price ?? 0}
                    />
                  </label>
                  <label>
                    Service status
                    <select
                      onChange={(event) =>
                        setServiceDrafts((current) => ({
                          ...current,
                          [activeService.serviceName]: {
                            ...activeServiceDraft,
                            status: event.target.value,
                          },
                        }))
                      }
                      value={activeServiceDraft?.status || 'pending'}
                    >
                      <option value="pending">Needs Review</option>
                      <option value="approved">Approved</option>
                      <option value="rejected">Rejected</option>
                      <option value="in progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </label>
                  <label>
                    Priority
                    <select
                      onChange={(event) =>
                        setServiceDrafts((current) => ({
                          ...current,
                          [activeService.serviceName]: {
                            ...activeServiceDraft,
                            priority: event.target.value,
                          },
                        }))
                      }
                      value={activeServiceDraft?.priority || 'medium'}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </label>
                </div>

                <label>
                  Service description
                  <textarea
                    onChange={(event) =>
                      setServiceDrafts((current) => ({
                        ...current,
                        [activeService.serviceName]: {
                          ...activeServiceDraft,
                          description: event.target.value,
                        },
                      }))
                    }
                    rows="3"
                    value={activeServiceDraft?.description || ''}
                  />
                </label>

                <label>
                  Admin note
                  <textarea
                    onChange={(event) =>
                      setServiceDrafts((current) => ({
                        ...current,
                        [activeService.serviceName]: {
                          ...activeServiceDraft,
                          adminRemarks: event.target.value,
                        },
                      }))
                    }
                    rows="3"
                    value={activeServiceDraft?.adminRemarks || ''}
                  />
                </label>

                <button
                  className="button button-primary"
                  disabled={savingKey === `service-${activeService.serviceName}`}
                  onClick={saveServiceAssignment}
                  type="button"
                >
                  {savingKey === `service-${activeService.serviceName}`
                    ? 'Saving...'
                    : activeService.assignment
                      ? 'Save Service Decision'
                      : 'Create Service & Save'}
                </button>
              </article>
            </div>

            {activeService.documents.length ? (
              <div className="admin-folder-file-list">
                {activeService.documents.map((documentRecord) => {
                  const draft = documentDrafts[documentRecord._id] || {
                    status: documentRecord.status,
                    remarks: documentRecord.remarks || '',
                  }

                  return (
                    <article className="admin-folder-file-row admin-folder-file-row-rich" key={documentRecord._id}>
                      <div>
                        <div className="admin-record-title-row">
                          <strong>{documentRecord.documentType || documentRecord.title}</strong>
                          <StatusBadge status={documentRecord.status} />
                        </div>
                        <p>{documentRecord.originalName || documentRecord.filename}</p>
                        <div className="admin-meta-row">
                          <span>Uploaded: {formatDateTime(documentRecord.createdAt)}</span>
                          <span>{documentRecord.uploadedBy?.role === 'admin' ? 'Shared by admin' : 'Submitted by user'}</span>
                        </div>
                      </div>

                      <div className="admin-inline-editor admin-inline-editor-wrap">
                        <label>
                          Status
                          <select
                            onChange={(event) =>
                              setDocumentDrafts((current) => ({
                                ...current,
                                [documentRecord._id]: {
                                  status: event.target.value,
                                  remarks: current[documentRecord._id]?.remarks ?? documentRecord.remarks ?? '',
                                },
                              }))
                            }
                            value={draft.status}
                          >
                            <option value="pending">Needs Review</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </label>
                        <label className="grow">
                          Admin note
                          <input
                            onChange={(event) =>
                              setDocumentDrafts((current) => ({
                                ...current,
                                [documentRecord._id]: {
                                  status: current[documentRecord._id]?.status || documentRecord.status,
                                  remarks: event.target.value,
                                },
                              }))
                            }
                            placeholder="Add verification remark"
                            type="text"
                            value={draft.remarks}
                          />
                        </label>
                        <div className="admin-record-actions">
                          <button
                            className="button button-primary button-compact"
                            onClick={() =>
                              downloadFileFromApi(
                                documentRecord.downloadUrl,
                                documentRecord.originalName || documentRecord.filename,
                              )
                            }
                            type="button"
                          >
                            Download
                          </button>
                          {documentRecord.fileUrl ? (
                            <a className="button button-ghost button-compact" href={documentRecord.fileUrl} rel="noreferrer" target="_blank">
                              Preview
                            </a>
                          ) : null}
                          <button
                            className="button button-ghost button-compact"
                            disabled={savingKey === documentRecord._id}
                            onClick={() => saveDocumentReview(documentRecord)}
                            type="button"
                          >
                            {savingKey === documentRecord._id ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : (
              <EmptyState
                description="No PDF or image document has been submitted for this service yet."
                title="No service documents"
              />
            )}
          </>
        ) : (
          <EmptyState description="Choose a client to start reviewing service-wise pricing and documents." title="No client selected" />
        )}
      </section>
    </section>
  )

  if (loading) {
    return <Loader message="Loading service workspace..." />
  }

  const headerContent =
    activeWorkspace === 'catalog'
      ? {
          title: 'Services Control Center',
          description: 'Admin yahin se decide karega kaun si services available hain, nayi service add karega, aur edit, delete, ya base price set karega.',
        }
      : {
          title: 'Client Service Pricing',
          description: 'Client-wise document review, final pricing, aur payment unlock flow ko yahin handle karein.',
        }

  return (
    <div className="page-stack">
      <PageHeader
        actions={
          <button className="button button-primary" onClick={handleStartNewCatalogItem} type="button">
            New Service
          </button>
        }
        description={headerContent.description}
        eyebrow="Services"
        title={headerContent.title}
      />

      {status.message ? <p className={`form-message ${status.type}`}>{status.message}</p> : null}

      <section className="admin-service-workspace-switch">
        <button
          className={`admin-service-workspace-tab ${activeWorkspace === 'catalog' ? 'active' : ''}`}
          onClick={() => setActiveWorkspace('catalog')}
          type="button"
        >
          <strong>Service Catalog</strong>
          <span>Available services, add, edit, delete, base price</span>
        </button>
        <button
          className={`admin-service-workspace-tab ${activeWorkspace === 'review' ? 'active' : ''}`}
          onClick={() => setActiveWorkspace('review')}
          type="button"
        >
          <strong>Client Pricing</strong>
          <span>Documents review, final price, payment unlock</span>
        </button>
      </section>

      {activeWorkspace === 'catalog' ? renderCatalogWorkspace() : renderReviewWorkspace()}
    </div>
  )
}

export default Services
