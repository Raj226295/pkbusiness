import mongoose from 'mongoose'

const appointmentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    scheduledFor: {
      type: Date,
      required: true,
    },
    serviceType: {
      type: String,
      default: 'General consultation',
      trim: true,
    },
    notes: {
      type: String,
      default: '',
    },
    adminNotes: {
      type: String,
      default: '',
    },
    rejectionReason: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'rescheduled', 'completed', 'cancelled'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  },
)

const Appointment = mongoose.model('Appointment', appointmentSchema)

export default Appointment
