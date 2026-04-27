import { useEffect, useState } from 'react'
import PageHeader from '../../components/common/PageHeader.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import Loader from '../../components/common/Loader.jsx'
import api, { extractApiError } from '../../lib/api.js'
import { formatCurrency, formatDate } from '../../lib/formatters.js'

const initialForm = {
  serviceType: 'Income Tax Filing',
  amount: 1500,
  description: 'Consultation invoice',
}

function loadRazorpayScript() {
  if (window.Razorpay) {
    return Promise.resolve(true)
  }

  return new Promise((resolve) => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

function Payments() {
  const [payments, setPayments] = useState([])
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState({ type: '', message: '' })

  const loadPayments = async () => {
    const { data } = await api.get('/api/payments')
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

  const handleChange = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.name === 'amount' ? Number(event.target.value) : event.target.value,
    }))
  }

  const openCheckout = async (response) => {
    const loaded = await loadRazorpayScript()

    if (!loaded || !response.checkout?.enabled || !window.Razorpay) {
      setStatus({
        type: 'success',
        message: 'Invoice created. Add Razorpay keys to enable online checkout automatically.',
      })
      return
    }

    const razorpay = new window.Razorpay({
      key: response.checkout.key,
      amount: response.checkout.amount,
      currency: response.checkout.currency,
      name: 'Singh Verma & Associates',
      description: response.checkout.description,
      order_id: response.checkout.orderId,
      prefill: response.checkout.prefill,
      handler: async (paymentResponse) => {
        try {
          await api.post('/api/payments/verify', {
            ...paymentResponse,
            paymentRecordId: response.payment._id,
          })
          await loadPayments()
          setStatus({ type: 'success', message: 'Payment completed successfully.' })
        } catch (error) {
          setStatus({ type: 'error', message: extractApiError(error) })
        }
      },
      theme: {
        color: '#0d6b5d',
      },
    })

    razorpay.open()
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setStatus({ type: '', message: '' })

    try {
      const { data } = await api.post('/api/payments', form)
      await loadPayments()
      await openCheckout(data)
    } catch (error) {
      setStatus({ type: 'error', message: extractApiError(error) })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <Loader message="Loading payments..." />
  }

  return (
    <div className="page-stack">
      <PageHeader
        description="Create invoices for consultation or service fees and track each payment status."
        eyebrow="Payments"
        title="Invoices & Checkout"
      />

      <section className="card-grid two-up">
        <form className="panel form-panel" onSubmit={handleSubmit}>
          <h3>Create a payment request</h3>
          <label>
            Service type
            <select name="serviceType" onChange={handleChange} value={form.serviceType}>
              <option>Income Tax Filing</option>
              <option>GST Registration & Return</option>
              <option>Audit Services</option>
              <option>Company Registration</option>
              <option>Accounting / Bookkeeping</option>
              <option>Consultation</option>
            </select>
          </label>
          <label>
            Amount
            <input min="1" name="amount" onChange={handleChange} required type="number" value={form.amount} />
          </label>
          <label>
            Description
            <textarea
              name="description"
              onChange={handleChange}
              rows="4"
              value={form.description}
            />
          </label>

          {status.message ? <p className={`form-message ${status.type}`}>{status.message}</p> : null}

          <button className="button button-primary" disabled={submitting} type="submit">
            {submitting ? 'Processing...' : 'Create Invoice'}
          </button>
        </form>

        <article className="panel">
          <h3>Invoice history</h3>
          {payments.length ? (
            <div className="list-stack">
              {payments.map((payment) => (
                <div className="list-item stretch" key={payment._id}>
                  <div>
                    <strong>{payment.invoiceNumber}</strong>
                    <p>
                      {payment.serviceType} | Created {formatDate(payment.createdAt)}
                    </p>
                    <small>{payment.description || 'Service invoice'}</small>
                  </div>
                  <div className="list-meta-group">
                    <span>{formatCurrency(payment.amount)}</span>
                    <StatusBadge status={payment.status} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState description="Invoices will appear here after you create one." title="No payments yet" />
          )}
        </article>
      </section>
    </div>
  )
}

export default Payments
