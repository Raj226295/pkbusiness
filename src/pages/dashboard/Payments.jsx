import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import PageHeader from '../../components/common/PageHeader.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import Loader from '../../components/common/Loader.jsx'
import { siteBrand } from '../../data/siteData.js'
import api, { extractApiError } from '../../lib/api.js'
import { formatCurrency, formatDate, formatDateTime } from '../../lib/formatters.js'

const initialForm = {
  catalogServiceId: '',
  serviceType: '',
  amount: 0,
  description: '',
  paymentMethod: 'online',
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
  const [catalog, setCatalog] = useState([])
  const [services, setServices] = useState([])
  const [form, setForm] = useState(initialForm)
  const [proofFile, setProofFile] = useState(null)
  const [fileInputKey, setFileInputKey] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState({ type: '', message: '' })
  const location = useLocation()

  const selectableServices = useMemo(() => {
    const activeRequestedServices = services
      .filter((service) => ['pending', 'in progress'].includes(service.status))
      .map((service) => ({
        key: service.catalogService?._id || service._id,
        name: service.type,
        description: service.description || service.notes || '',
        price: service.price || service.catalogService?.price || 0,
      }))

    if (activeRequestedServices.length) {
      return activeRequestedServices
    }

    return catalog.map((service) => ({
      key: service._id,
      name: service.name,
      description: service.description || '',
      price: service.price || 0,
    }))
  }, [catalog, services])

  const selectedService = useMemo(
    () => selectableServices.find((item) => item.key === form.catalogServiceId) || selectableServices[0] || null,
    [selectableServices, form.catalogServiceId],
  )

  const summary = useMemo(() => {
    return {
      total: payments.length,
      pending: payments.filter(
        (payment) => payment.status === 'pending' || payment.verificationStatus === 'pending',
      ).length,
      verified: payments.filter(
        (payment) => payment.status === 'paid' || payment.verificationStatus === 'verified',
      ).length,
      totalPaid: payments
        .filter((payment) => payment.status === 'paid')
        .reduce((total, payment) => total + Number(payment.amount || 0), 0),
    }
  }, [payments])

  const loadData = async () => {
    const [paymentsRes, catalogRes, servicesRes] = await Promise.all([
      api.get('/api/payments'),
      api.get('/api/services/catalog'),
      api.get('/api/services'),
    ])

    const catalogServices = catalogRes.data.services || []
    const requestedServices = servicesRes.data.services || []

    setPayments(paymentsRes.data.payments)
    setCatalog(catalogServices)
    setServices(requestedServices)
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

  useEffect(() => {
    if (!selectableServices.length) {
      return
    }

    const preferredId =
      location.state?.catalogServiceId &&
      selectableServices.some((item) => item.key === location.state.catalogServiceId)
        ? location.state.catalogServiceId
        : form.catalogServiceId

    const nextService =
      selectableServices.find((item) => item.key === preferredId) || selectableServices[0]

    if (!nextService) {
      return
    }

    setForm((current) => ({
      ...current,
      catalogServiceId: nextService.key,
      serviceType: nextService.name,
      amount: nextService.price,
      description: current.description || nextService.description || '',
    }))
  }, [form.catalogServiceId, location.state?.catalogServiceId, selectableServices])

  const handleChange = (event) => {
    const { name, value, files } = event.target

    if (name === 'catalogServiceId') {
      const nextService = selectableServices.find((item) => item.key === value)

      setForm((current) => ({
        ...current,
        catalogServiceId: value,
        serviceType: nextService?.name || '',
        amount: nextService?.price || 0,
        description: nextService?.description || '',
      }))
      return
    }

    if (name === 'screenshot') {
      setProofFile(files?.[0] || null)
      return
    }

    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const openCheckout = async (response) => {
    const loaded = await loadRazorpayScript()

    if (!loaded || !response.checkout?.enabled || !window.Razorpay) {
      setStatus({
        type: 'success',
        message:
          response.payment.paymentMethod === 'manual'
            ? 'Manual payment proof submitted successfully.'
            : 'Invoice created. Add Razorpay keys to enable online checkout automatically.',
      })
      return
    }

    const razorpay = new window.Razorpay({
      key: response.checkout.key,
      amount: response.checkout.amount,
      currency: response.checkout.currency,
      name: siteBrand.name,
      description: response.checkout.description,
      order_id: response.checkout.orderId,
      prefill: response.checkout.prefill,
      handler: async (paymentResponse) => {
        try {
          await api.post('/api/payments/verify', {
            ...paymentResponse,
            paymentRecordId: response.payment._id,
          })
          await loadData()
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

    const payload = new FormData()
    payload.append('catalogServiceId', form.catalogServiceId)
    payload.append('serviceType', form.serviceType)
    payload.append('amount', String(form.amount))
    payload.append('description', form.description)
    payload.append('paymentMethod', form.paymentMethod)

    if (proofFile) {
      payload.append('screenshot', proofFile)
    }

    try {
      const { data } = await api.post('/api/payments', payload, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      await loadData()
      setProofFile(null)
      setFileInputKey((current) => current + 1)
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
        description="See the selected service and fixed price, pay online, or upload a screenshot for manual verification."
        eyebrow="Payments"
        title="Payments & Verification"
      />

      <section className="card-grid two-up">
        <form className="panel form-panel" onSubmit={handleSubmit}>
          <h3>Pay for selected service</h3>
          <label>
            Selected service
            <select name="catalogServiceId" onChange={handleChange} value={form.catalogServiceId}>
              {selectableServices.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          {selectedService ? (
            <div className="service-catalog-preview">
              <strong>{selectedService.name}</strong>
              <p>{selectedService.description}</p>
              <span>{formatCurrency(selectedService.price)}</span>
            </div>
          ) : null}

          <label>
            Amount
            <input disabled min="1" name="amount" type="number" value={form.amount} />
          </label>
          <label>
            Message
            <textarea name="description" onChange={handleChange} rows="4" value={form.description} />
          </label>
          <label>
            Payment mode
            <select name="paymentMethod" onChange={handleChange} value={form.paymentMethod}>
              <option value="online">Pay Now (Gateway)</option>
              <option value="manual">Upload Payment Screenshot</option>
            </select>
          </label>
          {form.paymentMethod === 'manual' ? (
            <label>
              Payment screenshot
              <input
                accept="image/*,.pdf"
                key={fileInputKey}
                name="screenshot"
                onChange={handleChange}
                required
                type="file"
              />
            </label>
          ) : null}

          {status.message ? <p className={`form-message ${status.type}`}>{status.message}</p> : null}

          <button className="button button-primary" disabled={submitting || !selectableServices.length} type="submit">
            {submitting
              ? 'Processing...'
              : form.paymentMethod === 'manual'
                ? 'Submit for Verification'
                : 'Pay Now'}
          </button>
        </form>

        <article className="panel document-summary-panel">
          <h3>Payment summary</h3>
          <div className="document-summary-grid">
            <div className="document-stat-tile">
              <strong>{summary.total}</strong>
              <span>Total invoices</span>
            </div>
            <div className="document-stat-tile">
              <strong>{summary.pending}</strong>
              <span>Pending checks</span>
            </div>
            <div className="document-stat-tile">
              <strong>{summary.verified}</strong>
              <span>Verified / paid</span>
            </div>
            <div className="document-stat-tile">
              <strong>{formatCurrency(summary.totalPaid)}</strong>
              <span>Total paid</span>
            </div>
          </div>
          <ul className="bullet-list">
            <li>Gateway payments can be completed instantly from the pay button.</li>
            <li>Manual screenshot payments stay pending until admin verifies them.</li>
            <li>If payment is rejected, the admin remark will appear in the history below.</li>
          </ul>
        </article>
      </section>

      <section className="panel">
        <div className="document-history-head">
          <div>
            <span className="eyebrow">History</span>
            <h3>Invoice history</h3>
          </div>
        </div>

        {payments.length ? (
          <div className="list-stack">
            {payments.map((payment) => (
              <div className="card-inline" key={payment._id}>
                <div className="list-item stretch">
                  <div>
                    <strong>{payment.invoiceNumber}</strong>
                    <p>
                      {payment.serviceType} | Created {formatDate(payment.createdAt)}
                    </p>
                    <small>{payment.description || 'Service invoice'}</small>
                  </div>
                  <div className="list-meta-group">
                    <span>{formatCurrency(payment.amount)}</span>
                    <StatusBadge status={payment.verificationStatus || payment.status} />
                  </div>
                </div>
                <div className="detail-row">
                  <span>Mode: {payment.paymentMethod === 'manual' ? 'Manual / UPI' : 'Online checkout'}</span>
                  <span>{payment.transactionId || 'Reference pending'}</span>
                  <span>{payment.paidAt ? `Paid ${formatDateTime(payment.paidAt)}` : 'Awaiting completion'}</span>
                </div>
                {payment.reviewRemarks ? <p className="document-remarks">Admin remarks: {payment.reviewRemarks}</p> : null}
                {payment.screenshotUrl ? (
                  <a className="button button-ghost button-compact" href={payment.screenshotUrl} rel="noreferrer" target="_blank">
                    View Uploaded Proof
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState description="Invoices will appear here after you create one." title="No payments yet" />
        )}
      </section>
    </div>
  )
}

export default Payments
