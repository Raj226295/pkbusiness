import { useEffect, useState } from 'react'
import PageHeader from '../../components/common/PageHeader.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import Loader from '../../components/common/Loader.jsx'
import api, { extractApiError } from '../../lib/api.js'
import { formatCurrency, formatDate } from '../../lib/formatters.js'

function Payments() {
  const [payments, setPayments] = useState([])
  const [updates, setUpdates] = useState({})
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState({ type: '', message: '' })

  const loadPayments = async () => {
    const { data } = await api.get('/api/admin/payments')
    setPayments(data.payments)
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

  const updateField = (paymentId, field, value) => {
    setUpdates((current) => ({
      ...current,
      [paymentId]: {
        status: current[paymentId]?.status || 'pending',
        transactionId: current[paymentId]?.transactionId || '',
        [field]: value,
      },
    }))
  }

  const savePayment = async (paymentId) => {
    try {
      await api.patch(`/api/admin/payments/${paymentId}`, updates[paymentId])
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
        description="Monitor payment requests, confirm settlements, and attach transaction references."
        eyebrow="Admin"
        title="Transactions"
      />

      {status.message ? <p className={`form-message ${status.type}`}>{status.message}</p> : null}

      {payments.length ? (
        <div className="list-stack">
          {payments.map((payment) => {
            const draft = updates[payment._id] || {
              status: payment.status,
              transactionId: payment.transactionId || '',
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
                      {formatCurrency(payment.amount)} | Created {formatDate(payment.createdAt)}
                    </small>
                  </div>
                  <StatusBadge status={payment.status} />
                </div>

                <div className="inline-form">
                  <select
                    onChange={(event) => updateField(payment._id, 'status', event.target.value)}
                    value={draft.status}
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="failed">Failed</option>
                  </select>
                  <input
                    onChange={(event) => updateField(payment._id, 'transactionId', event.target.value)}
                    placeholder="Transaction ID"
                    type="text"
                    value={draft.transactionId}
                  />
                  <button className="button button-primary" onClick={() => savePayment(payment._id)} type="button">
                    Save
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <EmptyState description="Invoices and payment attempts will appear here." title="No payment records found" />
      )}
    </div>
  )
}

export default Payments
