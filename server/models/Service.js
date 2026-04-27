import mongoose from 'mongoose'

const serviceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
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
  },
  {
    timestamps: true,
  },
)

const Service = mongoose.model('Service', serviceSchema)

export default Service
