import mongoose from 'mongoose'

const paymentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
    },
    serviceType: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
    },
    amount: {
      type: Number,
      required: true,
      min: 1,
    },
    paymentMethod: {
      type: String,
      enum: ['online', 'manual'],
      default: 'online',
    },
    currency: {
      type: String,
      default: 'INR',
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'rejected'],
      default: 'pending',
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    transactionId: {
      type: String,
      default: '',
    },
    razorpayOrderId: {
      type: String,
      default: '',
    },
    razorpayPaymentId: {
      type: String,
      default: '',
    },
    paidAt: {
      type: Date,
    },
    screenshotUrl: {
      type: String,
      default: '',
    },
    screenshotName: {
      type: String,
      default: '',
    },
    reviewRemarks: {
      type: String,
      default: '',
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
)

const Payment = mongoose.model('Payment', paymentSchema)

export default Payment
