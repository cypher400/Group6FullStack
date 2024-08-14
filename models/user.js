const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const CarDetailsSchema = new mongoose.Schema({
  make: { type: String, default: "default" },
  model: { type: String, default: "default" },
  year: { type: Number, default: 0 },
  plateNumber: { type: String, default: "default" }
});

const AppointmentSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true,
  },
  time: {
    type: String,
    required: true,
  },
  isTimeSlotAvailable: {
    type: Boolean,
    required: true,
    default: true,
  },
  bookedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    default: "Pending" // Can be "Pending", "Pass", or "Fail"
  },
  comments: {
    type: String,
    default: "" // Examiner's comments on the appointment
  },
  testType: {
    type: String,
    enum: ['G2', 'G'],
    required: true,
  }
});

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  userType: {
    type: String,
    enum: ['Driver', 'Admin', 'Examiner'],
    required: true,
  },
  firstName: String,
  lastName: String,
  licenseNumber: String,
  age: Number,
  carDetails: {
    make: String,
    model: String,
    year: Number,
    plateNumber: String,
  },
  appointments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' }],
  testType: {
    type: String,
    enum: ['G2', 'G'],
    required: false, // Only required for Drivers
  },
  comment: {
    type: String,
    default: "", // Examiner's comment on the user's test performance
  },
  passFailStatus: {
    type: String,
    enum: ['Pass', 'Fail', 'Pending'],
    default: 'Pending' // Initial status is pending
  }
});

UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(this.password, salt);
    this.password = hashedPassword;
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('User', UserSchema);
