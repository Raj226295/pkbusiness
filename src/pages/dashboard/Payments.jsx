import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import EmptyState from '../../components/common/EmptyState.jsx'
import Loader from '../../components/common/Loader.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import StatusBadge from '../../components/common/StatusBadge.jsx'
import { siteBrand } from '../../data/siteData.js'
import api, { extractApiError } from '../../lib/api.js'
import { formatCurrency, formatDate, formatDateTime } from '../../lib/formatters.js'
import { getServicePaymentEligibility } from '../../lib/paymentEligibility.js'

const initialForm = {
  serviceId: '',
  description: '',
  paymentMethod: 'online',
  transactionId: '',
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

function getStageTitle(stage) {
  switch (stage) {
    case 'service_completed':
      return 'Service completed'
    case 'service_rejected':
      return 'Service rejected'
    case 'service_in_progress':
      return 'Work in progress'
    case 'ready':
      return 'Payment ready'
    case 'retry':
      return 'Retry payment'
    case 'under_review':
      return 'Payment under review'
    case 'approved':
      return 'Payment approved'
    case 'review_pending':
      return 'Waiting for document review'
    case 'reupload_required':
      return 'Upload corrected documents'
    case 'awaiting_price':
      return 'Waiting for admin price'
    case 'service_pending_approval':
      return 'Waiting for service approval'
    case 'upload_documents':
      return 'Upload documents first'
    default:
      return 'Waiting for next step'
  }
}

function getStageMessage(state) {
  switch (state.stage) {
    case 'service_completed':
      return 'Admin has already marked this service as completed.'
    case 'service_rejected':
      return 'Admin rejected this service. Please check the remark on the service card or contact admin.'
    case 'service_in_progress':
      return 'Your payment is verified and the admin team is now working on this service.'
    case 'ready':
      return 'Admin has reviewed your documents and set the service price. You can pay now.'
    case 'retry':
      return state.latestPayment?.reviewRemarks
        ? `Last payment was rejected: ${state.latestPayment.reviewRemarks}`
        : 'Your earlier payment was rejected. Upload a fresh proof or pay again.'
    case 'under_review':
      return 'Your payment request is already with admin for screenshot and transaction verification.'
    case 'approved':
      return 'Payment has already been approved for this service.'
    case 'review_pending':
      return 'Admin is still checking your uploaded documents. Payment will open after review.'
    case 'reupload_required':
      return 'At least one document was rejected. Please re-upload the corrected file first.'
    case 'awaiting_price':
      return 'Documents are reviewed. Admin still needs to set the final service price.'
    case 'service_pending_approval':
      return 'Admin will first approve this service, then payment will open after review and pricing.'
    case 'upload_documents':
      return 'Upload the required service documents first, then admin can review them.'
    default:
      return 'This service is not ready for payment yet.'
  }
}

function Payments() {
  const [payments, setPayments] = useState([])
  const [services, setServices] = useState([])
  const [documents, setDocuments] = useState([])
  const [form, setForm] = useState(initialForm)
  const [proofFile, setProofFile] = useState(null)
  const [fileInputKey, setFileInputKey] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [status, setStatus] = useState({ type: '', message: '' })
  const location = useLocation()

  const serviceStates = useMemo(
    () =>
      services.map((service) => ({
        service,
        eligibility: getServicePaymentEligibility({
          service,
          documents,
          payments,
        }),
      })),
    [documents, payments, services],
  )

  const selectableServices = useMemo(
    () => serviceStates.filter((item) => item.eligibility.isReadyForPayment).map((item) => item.service),
    [serviceStates],
  )

  const selectedService = useMemo(
    () => selectableServices.find((service) => service._id === form.serviceId) || selectableServices[0] || null,
    [form.serviceId, selectableServices],
  )

  const selectedServiceState = useMemo(
    () => serviceStates.find((item) => item.service._id === selectedService?._id) || null,
    [selectedService?._id, serviceStates],
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
      readyToPay: selectableServices.length,
    }
  }, [payments, selectableServices.length])

  const loadData = async () => {
    const [paymentsRes, servicesRes, documentsRes] = await Promise.all([
      api.get('/api/payments'),
      api.get('/api/services'),
      api.get('/api/documents'),
    ])

    setPayments(paymentsRes.data.payments || [])
    setServices(servicesRes.data.services || [])
    setDocuments(documentsRes.data.documents || [])
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
      setForm((current) => ({
        ...current,
        serviceId: '',
      }))
      return
    }

    const preferredId =
      location.state?.serviceId && selectableServices.some((service) => service._id === location.state.serviceId)
        ? location.state.serviceId
        : form.serviceId

    const nextService = selectableServices.find((service) => service._id === preferredId) || selectableServices[0]

    if (!nextService) {
      return
    }

    setForm((current) => ({
      ...current,
      serviceId: nextService._id,
    }))
  }, [form.serviceId, location.state?.serviceId, selectableServices])

  const handleChange = (event) => {
    const { name, value, files } = event.target

    if (name === 'serviceId') {
      setForm((current) => ({
        ...current,
        serviceId: value,
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
            ? 'Payment proof submitted successfully. Admin will verify it shortly.'
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
    payload.append('serviceId', form.serviceId)
    payload.append('description', form.description)
    payload.append('paymentMethod', form.paymentMethod)

    if (form.paymentMethod === 'manual') {
      payload.append('transactionId', form.transactionId)
    }

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
      setForm((current) => ({
        ...initialForm,
        serviceId: current.serviceId,
      }))
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
        description="Pay only after admin approves the service, reviews your documents, and sets the final service price. Manual payments need screenshot and transaction reference."
        eyebrow="Payments"
        title="Payments & Verification"
      />

      <section className="card-grid two-up">
        <section className="panel form-panel">
          {selectableServices.length ? (
            <form onSubmit={handleSubmit}>
              <h3>Pay for approved service</h3>
              <label>
                Selected service
                <select name="serviceId" onChange={handleChange} value={form.serviceId}>
                  {selectableServices.map((service) => (
                    <option key={service._id} value={service._id}>
                      {service.type}
                    </option>
                  ))}
                </select>
              </label>

              {selectedService ? (
                <div className="service-catalog-preview">
                  <strong>{selectedService.type}</strong>
                  <p>{selectedService.description || selectedService.adminRemarks || 'Admin has reviewed this service and opened payment.'}</p>
                  <span>{formatCurrency(selectedService.price || 0)}</span>
                </div>
              ) : null}

              {selectedServiceState?.eligibility.latestRejectedPayment ? (
                <p className="form-message error">
                  {getStageMessage(selectedServiceState.eligibility)}
                </p>
              ) : null}

              <label>
                Amount
                <input disabled min="1" type="number" value={selectedService?.price || 0} />
              </label>
              <label>
                Message
                <textarea
                  name="description"
                  onChange={handleChange}
                  placeholder="Optional note for admin"
                  rows="4"
                  value={form.description}
                />
              </label>
              <label>
                Payment mode
                <select name="paymentMethod" onChange={handleChange} value={form.paymentMethod}>
                  <option value="online">Pay Now (Gateway)</option>
                  <option value="manual">Upload Payment Screenshot</option>
                </select>
              </label>
              {form.paymentMethod === 'manual' ? (
                <>
                  <label>
                    Transaction ID / UPI reference
                    <input
                      name="transactionId"
                      onChange={handleChange}
                      placeholder="Enter transaction reference"
                      required
                      type="text"
                      value={form.transactionId}
                    />
                  </label>
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
                </>
              ) : null}

              {status.message ? <p className={`form-message ${status.type}`}>{status.message}</p> : null}

              <button className="button button-primary" disabled={submitting || !selectedService} type="submit">
                {submitting
                  ? 'Processing...'
                  : form.paymentMethod === 'manual'
                    ? 'Submit for Verification'
                    : 'Pay Now'}
              </button>
            </form>
          ) : (
            <div>
              <h3>No payment ready yet</h3>
              <p>
                Payment box tabhi dikhega jab admin service approve karke document review aur pricing complete karega.
              </p>
              <EmptyState
                description="Upload documents, wait for admin approval and review, and come back here once payment opens for your service."
                title="Nothing to pay right now"
              />
              {status.message ? <p className={`form-message ${status.type}`}>{status.message}</p> : null}
            </div>
          )}
        </section>

        <article className="panel document-summary-panel">
          <h3>Payment summary</h3>
          <div className="document-summary-grid">
            <div className="document-stat-tile">
              <strong>{summary.total}</strong>
              <span>Total invoices</span>
            </div>
            <div className="document-stat-tile">
              <strong>{summary.pending}</strong>
              <span>Under review</span>
            </div>
            <div className="document-stat-tile">
              <strong>{summary.verified}</strong>
              <span>Verified / paid</span>
            </div>
            <div className="document-stat-tile">
              <strong>{summary.readyToPay}</strong>
              <span>Ready to pay</span>
            </div>
            <div className="document-stat-tile">
              <strong>{formatCurrency(summary.totalPaid)}</strong>
              <span>Total paid</span>
            </div>
          </div>

          {serviceStates.length ? (
            <div className="list-stack">
              {serviceStates.map(({ service, eligibility }) => (
                <div className="card-inline" key={service._id}>
                  <div className="list-item stretch">
                    <div>
                      <strong>{service.type}</strong>
                      <p>{getStageTitle(eligibility.stage)}</p>
                      <small>{getStageMessage(eligibility)}</small>
                    </div>
                  <div className="list-meta-group">
                      <span>{service.price ? formatCurrency(service.price) : 'Price pending'}</span>
                      <StatusBadge status={service.status} />
                      {eligibility.latestPayment ? (
                        <StatusBadge status={eligibility.latestPayment.verificationStatus || eligibility.latestPayment.status} />
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>No services found in your dashboard yet.</p>
          )}
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
