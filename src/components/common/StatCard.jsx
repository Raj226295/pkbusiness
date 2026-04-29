import { Link } from 'react-router-dom'

function StatCard({ label, value, hint, to = '', actionLabel = 'Open' }) {
  if (to) {
    return (
      <Link className="stat-card stat-card-link" to={to}>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{hint}</small>
        <span className="stat-card-action">{actionLabel}</span>
      </Link>
    )
  }

  return (
    <article className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </article>
  )
}

export default StatCard
