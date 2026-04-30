function toServiceId(value) {
  if (!value) {
    return ''
  }

  if (typeof value === 'string') {
    return value
  }

  return value._id || ''
}

function canAcceptPaymentForService(status = '') {
  return ['approved', 'in progress'].includes(status)
}

export function getServiceDocuments(documents = [], service = null) {
  if (!service?.type) {
    return []
  }

  return documents.filter((document) => document.serviceType === service.type)
}

export function getServicePayments(payments = [], service = null) {
  if (!service?.type) {
    return []
  }

  const serviceId = toServiceId(service)

  return payments
    .filter((payment) => {
      const paymentServiceId = toServiceId(payment?.service)

      if (serviceId && paymentServiceId) {
        return paymentServiceId === serviceId
      }

      return payment.serviceType === service.type
    })
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
}

export function getServicePaymentEligibility({ service, documents = [], payments = [] }) {
  const serviceDocuments = getServiceDocuments(documents, service)
  const servicePayments = getServicePayments(payments, service)
  const latestPayment = servicePayments[0] || null
  const serviceStatus = String(service?.status || 'pending').toLowerCase()
  const isServiceRejected = serviceStatus === 'rejected'
  const isServiceCompleted = serviceStatus === 'completed'
  const canAcceptPayment = canAcceptPaymentForService(serviceStatus)
  const approvedDocuments = serviceDocuments.filter((document) => document.status === 'approved').length
  const pendingDocuments = serviceDocuments.filter((document) => document.status === 'pending').length
  const rejectedDocuments = serviceDocuments.filter((document) => document.status === 'rejected').length
  const hasDocuments = serviceDocuments.length > 0
  const hasAdminPrice = Number(service?.price || 0) > 0
  const allDocumentsApproved =
    hasDocuments && approvedDocuments === serviceDocuments.length && pendingDocuments === 0 && rejectedDocuments === 0
  const hasPendingPayment = servicePayments.some(
    (payment) => payment.verificationStatus === 'pending' || payment.status === 'pending',
  )
  const hasVerifiedPayment = servicePayments.some(
    (payment) => payment.verificationStatus === 'verified' || payment.status === 'paid',
  )
  const latestRejectedPayment = Boolean(
    latestPayment &&
      !hasPendingPayment &&
      !hasVerifiedPayment &&
      (latestPayment.verificationStatus === 'rejected' || latestPayment.status === 'rejected'),
  )
  const isReadyForPayment =
    Boolean(service?._id) &&
    canAcceptPayment &&
    hasAdminPrice &&
    allDocumentsApproved &&
    !hasPendingPayment &&
    !hasVerifiedPayment

  let stage = 'waiting'

  if (isServiceCompleted) {
    stage = 'service_completed'
  } else if (isServiceRejected) {
    stage = 'service_rejected'
  } else if (hasVerifiedPayment && serviceStatus === 'in progress') {
    stage = 'service_in_progress'
  } else if (hasVerifiedPayment) {
    stage = 'approved'
  } else if (hasPendingPayment) {
    stage = 'under_review'
  } else if (latestRejectedPayment) {
    stage = 'retry'
  } else if (!hasDocuments) {
    stage = 'upload_documents'
  } else if (rejectedDocuments > 0) {
    stage = 'reupload_required'
  } else if (pendingDocuments > 0) {
    stage = 'review_pending'
  } else if (!canAcceptPayment) {
    stage = 'service_pending_approval'
  } else if (!hasAdminPrice) {
    stage = 'awaiting_price'
  } else if (isReadyForPayment) {
    stage = 'ready'
  }

  return {
    stage,
    serviceStatus,
    canAcceptPayment,
    isServiceRejected,
    isServiceCompleted,
    amount: Number(service?.price || 0),
    hasAdminPrice,
    hasDocuments,
    allDocumentsApproved,
    approvedDocuments,
    pendingDocuments,
    rejectedDocuments,
    isReadyForPayment,
    hasPendingPayment,
    hasVerifiedPayment,
    latestRejectedPayment,
    latestPayment,
    serviceDocuments,
    servicePayments,
  }
}

export function getPayableServices(services = [], documents = [], payments = []) {
  return services.filter((service) =>
    getServicePaymentEligibility({
      service,
      documents,
      payments,
    }).isReadyForPayment,
  )
}
