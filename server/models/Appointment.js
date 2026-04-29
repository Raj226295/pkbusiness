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
    notes: {
      type: String,
      default: '',
    },
    adminNotes: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['pending', 'scheduled', 'confirmed', 'completed', 'cancelled', 'rejected'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  },
)

const Appointment = mongoose.model('Appointment', appointmentSchema)

export default Appointment
