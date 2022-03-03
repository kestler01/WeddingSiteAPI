const mongoose = require('mongoose')

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true
    },
    isAdmin: {
      // for A&A to view db remotely
      type: Boolean,
      required: false
    },
    isRsvped: {
      type: Boolean,
      required: false
    },
    hashedPassword: {
      type: String,
      required: true
    },
    token: String
  },
  {
    timestamps: true,
    toObject: {
      // remove `hashedPassword` field when we call `.toObject`
      transform: (_doc, user) => {
        delete user.hashedPassword
        return user
      }
    }
  }
)

module.exports = mongoose.model('User', userSchema)
