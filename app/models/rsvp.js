const mongoose = require('mongoose')

const rsvpSchema = new mongoose.Schema(
  {
    Attending: {
      type: Boolean,
      required: true
    },
    NumberAttending: {
      type: Number,
      required: true
    },
    Names: {
      type: Array,
      required: true
    },
    Notes: {
      type: String,
      required: true
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
)

module.exports = mongoose.model('rsvp', rsvpSchema)
