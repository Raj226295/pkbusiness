import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import PageHeader from '../../components/common/PageHeader.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import Loader from '../../components/common/Loader.jsx'
import api, { extractApiError } from '../../lib/api.js'
import { formatCurrency, formatDateTime } from '../../lib/formatters.js'

const allowedFilters = new Set(['all', 'pending', 'verified', 'rejected', 'paid'])

function Payments() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [payments, setPayments] = useState([])
  const [summary, setSummary] = useState({
    totalEarnings: 0,
    pending: 0,
    verified: 0,
    rejected: 0,
  })
  const [updates, setUpdates] = useState({})
  const [filter, setFilter] = useState(() => {
    const requestedFilter = searchParams.get('filter') || 'all'
    return allowedFilters.has(requestedFilter) ? requestedFilter : 'all'
  })
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState({ type: '', message: '' })

  useEffect(() => {
    const requestedFilter = searchParams.get('filter') || 'all'
    const nextFilter = allowedFilters.has(requestedFilter) ? requestedFilter : 'all'

    setFilter((current) => (current === nextFilter ? current : nextFilter))
  }, [searchParams])

  const filteredPayments = useMemo(() => {
    if (filter === 'all') {
      return payments
    }

    return payments.filter(
      (payment) => payment.status === filter || payment.verificationStatus === filter,
    )
  }, [payments, filter])

  const loadPayments = async () => {
    const { data } = await api.get('/api/admin/payments')
    setPayments(data.payments)
    setSummary(data.summary)
  }

  useEffect(() => {
    loadPayments()
      .catch((error) => {
        setStatus({ type: 'error', message: extractApiError(error) })
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  const handleFilterChange = (nextFilter) => {
    setFilter(nextFilter)
    setSearchParams(nextFilter === 'all' ? {} : { filter: nextFilter })
  }

  const updateField = (payment, field, value) => {
    setUpdates((current) => ({
      ...current,
      [payment._id]: {
        verificationStatus:
          current[payment._id]?.verificationStatus || payment.verificationStatus || 'pending',
        transactionId: current[payment._id]?.transactionId ?? payment.transactionId ?? '',
        reviewRemarks: current[payment._id]?.reviewRemarks ?? payment.reviewRemarks ?? '',
        [field]: value,
      },
    }))
  }

  const savePayment = async (payment) => {
    try {
      await api.patch(`/api/admin/payments/${payment._id}`, updates[payment._id] || {
        verificationStatus: payment.verificationStatus || 'pending',
        transactionId: payment.transactionId || '',
        reviewRemarks: payment.reviewRemarks || '',
      })
      await loadPayments()
      setStatus({ type: 'success', message: 'Payment updated successfully.' })
    } catch (error) {
      setStatus({ type: 'error', message: extractApiError(error) })
    }
  }

  if (loading) {
    return <Loader message="Loading transactions..." />
  }

  return (
    <div className="page-stack">
      <PageHeader
        description="Review payment proofs, verify or reject requests, and track earnings across all clients."
        eyebrow="Admin"
        title="Payments"
      />

      {status.message ? <p className={`form-message ${status.type}`}>{status.message}</p> : null}

      <section className="card-grid two-up">
        <article className="panel">
          <h3>Earnings report</h3>
          <div className="document-summary-grid">
            <div className="document-stat-tile">
              <strong>{formatCurrency(summary.totalEarnings)}</strong>
              <span>Total earnings</span>
            </div>
            <div className="document-stat-tile">
              <strong>{summary.pending}</strong>
              <span>Pending checks</span>
            </div>
            <div className="document-stat-tile">
              <strong>{summary.verified}</strong>
              <span>Verified</span>
            </div>
            <div className="document-stat-tile">
              <strong>{summary.rejected}</strong>
              <span>Rejected</span>
            </div>
          </div>
        </article>

        <article className="panel form-panel">
          <h3>Filter payments</h3>
          <label>
            Status
            <select onChange={(event) => handleFilterChange(event.target.value)} value={filter}>
              <option value="all">All payments</option>
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
              <option value="paid">Paid</option>
            </select>
          </label>
          <p>Manual proof uploads can be previewed below before you verify or reject them.</p>
        </article>
      </section>

      {filteredPayments.length ? (
        <div className="list-stack">
          {filteredPayments.map((payment) => {
            const draft = updates[payment._id] || {
              verificationStatus: payment.verificationStatus || 'pending',
              transactionId: payment.transactionId || '',
              reviewRemarks: payment.reviewRemarks || '',
            }

            return (
              <article className="panel" key={payment._id}>
                <div className="list-item stretch">
                  <div>
                    <strong>{payment.invoiceNumber}</strong>
                    <p>
                      {payment.user?.name || 'Unknown client'} | {payment.serviceType}
                    </p>
                    <small>
                      {formatCurrency(payment.amount)} | {formatDateTime(payment.createdAt)}
                    </small>
                  </div>
                  <div className="list-meta-group">
                    <StatusBadge status={payment.status} />
                    <StatusBadge status={payment.verificationStatus || 'pending'} />
                  </div>
                </div>

                <div className="detail-row">
                  <span>Method: {payment.paymentMethod === 'manual' ? 'Manual / UPI' : 'Online checkout'}</span>
                  <span>{payment.transactionId ? `Transaction ID: ${payment.transactionId}` : 'Transaction ID not added yet'}</span>
                  <span>{payment.verifiedBy?.name ? `Verified by ${payment.verifiedBy.name}` : 'Awaiting verification'}</span>
                </div>

                {payment.description ? <p>{payment.description}</p> : null}

                {payment.screenshotUrl ? (
                  <div className="payment-proof-card">
                    <img alt={`${payment.invoiceNumber} payment proof`} className="payment-proof-image" src={payment.screenshotUrl} />
                    <a className="button button-ghost button-compact" href={payment.screenshotUrl} rel="noreferrer" target="_blank">
                      Preview Screenshot
                    </a>
                  </div>
                ) : null}

                <div className="admin-inline-grid">
                  <label>
                    Verification
                    <select
                      onChange={(event) => updateField(payment, 'verificationStatus', event.target.value)}
                      value={draft.verificationStatus}
                    >
                      <option value="pending">Pending</option>
                      <option value="verified">Verified</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </label>
                  <label>
                    Transaction ID
                    <input
                      onChange={(event) => updateField(payment, 'transactionId', event.target.value)}
                      placeholder="Transaction reference"
                      type="text"
                      value={draft.transactionId}
                    />
                  </label>
                </div>

                <label>
                  Review remarks
                  <textarea
                    onChange={(event) => updateField(payment, 'reviewRemarks', event.target.value)}
                    rows="4"
                    value={draft.reviewRemarks}
                  />
                </label>

                <button className="button button-primary" onClick={() => savePayment(payment)} type="button">
                  Save Payment Review
                </button>
              </article>
            )
          })}
        </div>
      ) : (
        <EmptyState description="Payment requests and completed transactions will appear here." title="No payment records found" />
      )}
    </div>
  )
}

export default Payments
