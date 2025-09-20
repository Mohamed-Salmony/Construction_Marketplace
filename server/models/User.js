import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  firstName: { type: String },
  middleName: { type: String },
  lastName: { type: String },
  name: { type: String },
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ['User', 'Admin', 'Merchant', 'Worker', 'Technician', 'Customer'],
    default: 'User',
  },
  phoneNumber: { type: String },
  phoneSecondary: { type: String },
  dateOfBirth: { type: Date },
  isActive: { type: Boolean, default: true },
  isVerified: { type: Boolean, default: false },
  companyName: String,
  city: String,
  country: String,
  address: String,
  postalCode: String,
  buildingNumber: String,
  streetName: String,
  profilePicture: String,
  documentPath: String,
  licenseImagePath: String,
  // Cloudinary URLs
  documentUrl: String,
  imageUrl: String,
  licenseImageUrl: String,
  // Vendor/Technician fields
  iban: String,
  taxNumber: String,
  registryStart: String,
  registryEnd: String,
  profession: String, // e.g., electrician, plumber
}, { timestamps: true });

export const User = mongoose.models.User || mongoose.model('User', userSchema);
