import mongoose from 'mongoose'

const serviceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    requestedByClient: {
      type: Boolean,
      default: false,
    },
    catalogService: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ServiceCatalog',
      default: null,
    },
    type: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    price: {
      type: Number,
      min: 0,
      default: 0,
    },
    status: {
      type: String,
      enum: ['pending', 'in progress', 'completed'],
      default: 'pending',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    notes: {
      type: String,
      default: '',
    },
    adminRemarks: {
      type: String,
      default: '',
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
)

const Service = mongoose.model('Service', serviceSchema)

export default Service
