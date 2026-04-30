const toneMap = {
  completed: 'success',
  verified: 'success',
  approved: 'success',
  paid: 'success',
  confirmed: 'success',
  pending: 'warning',
  scheduled: 'info',
  inprogress: 'info',
  'in progress': 'info',
  rejected: 'danger',
  cancelled: 'danger',
}

function normalizeStatusKey(value = '') {
  return String(value).toLowerCase().replace(/\s+/g, '')
}

function StatusBadge({ status = 'pending', hiddenStatuses = ['pending'] }) {
  if (!status) {
    return null
  }

  const normalized = String(status).toLowerCase()
  const normalizedKey = normalizeStatusKey(status)
  const shouldHide = hiddenStatuses.some((item) => normalizeStatusKey(item) === normalizedKey)

  if (shouldHide) {
    return null
  }

  const tone = toneMap[normalizedKey] || toneMap[normalized] || 'neutral'

  return <span className={`status-badge ${tone}`}>{status}</span>
}

export default StatusBadge
