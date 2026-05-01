const toneMap = {
  completed: 'success',
  verified: 'success',
  approved: 'success',
  paid: 'success',
  confirmed: 'success',
  pending: 'warning',
  scheduled: 'info',
  rescheduled: 'info',
  inprogress: 'info',
  'in progress': 'info',
  rejected: 'danger',
  cancelled: 'danger',
  failed: 'danger',
  notsubmitted: 'neutral',
  notinitiated: 'neutral',
  neutral: 'neutral',
}

const labelMap = {
  approved: 'Approved',
  cancelled: 'Cancelled',
  completed: 'Completed',
  confirmed: 'Approved',
  failed: 'Failed',
  'in progress': 'In Progress',
  inprogress: 'In Progress',
  notinitiated: 'Not Initiated',
  notsubmitted: 'Not Submitted',
  paid: 'Paid',
  pending: 'Pending',
  rejected: 'Rejected',
  rescheduled: 'Rescheduled',
  scheduled: 'Rescheduled',
  verified: 'Approved',
}

function normalizeStatusKey(value = '') {
  return String(value).toLowerCase().replace(/\s+/g, '')
}

function formatStatusLabel(status = '') {
  const normalizedKey = normalizeStatusKey(status)

  if (labelMap[normalizedKey]) {
    return labelMap[normalizedKey]
  }

  return String(status)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function StatusBadge({ status = 'pending', hiddenStatuses = [] }) {
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

  return <span className={`status-badge ${tone}`}>{formatStatusLabel(status)}</span>
}

export default StatusBadge
