import mongoose from 'mongoose'

const documentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    documentType: {
      type: String,
      default: '',
      trim: true,
    },
    serviceType: {
      type: String,
      required: true,
      trim: true,
    },
    filename: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      default: '',
    },
    relativePath: {
      type: String,
      default: '',
    },
    storageFolder: {
      type: String,
      default: '',
    },
    fileUrl: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'verified', 'rejected'],
      default: 'pending',
    },
    remarks: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
)

const Document = mongoose.model('Document', documentSchema)

export default Document
