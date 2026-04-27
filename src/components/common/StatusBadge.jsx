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

function StatusBadge({ status = 'pending' }) {
  const normalized = status.toLowerCase()
  const tone = toneMap[normalized.replace(/\s+/g, '')] || toneMap[normalized] || 'neutral'

  return <span className={`status-badge ${tone}`}>{status}</span>
}

export default StatusBadge
