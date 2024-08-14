const mongoose = require('mongoose');

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
    ref: 'User',
  },
  status: {
    type: String,
    default: "Pending", // Can be "Pending", "Pass", or "Fail"
  },
  comments: {
    type: String,
    default: "", // Examiner's comments on the appointment
  },
  testType: {
    type: String,
    enum: ['G2', 'G'], // Only allow "G2" or "G"
    required: true,
  }
});

module.exports = mongoose.model('Appointment', AppointmentSchema);
