import mongoose from 'mongoose'

const serviceCatalogSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    image: {
      type: String,
      default: '',
    },
    imageZoom: {
      type: Number,
      default: 1,
    },
    imageOffsetX: {
      type: Number,
      default: 0,
    },
    imageOffsetY: {
      type: Number,
      default: 0,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  },
)

const ServiceCatalog = mongoose.model('ServiceCatalog', serviceCatalogSchema)

export default ServiceCatalog
