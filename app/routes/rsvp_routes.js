// Express docs: http://expressjs.com/en/api.html
const express = require('express')
// Passport docs: http://www.passportjs.org/docs/
const passport = require('passport')

// this is a collection of methods that help us detect situations when we need
// to throw a custom error
const customErrors = require('../../lib/custom_errors')

// we'll use this function to send 404 when non-existent document is requested
const handle404 = customErrors.handle404
// we'll use this function to send 401 when a user tries to modify a resource
// that's owned by someone else
const requireOwnership = customErrors.requireOwnership

// passing this as a second argument to `router.<verb>` will make it
// so that a token MUST be passed for that route to be available
// it will also set `req.user`
const requireToken = passport.authenticate('bearer', { session: false })

// instantiate a router (mini app that only handles routes)
const router = express.Router()

// pull in Mongoose models
const User = require('../models/user') // to update isRsvped
const Rsvp = require('../models/rsvp.js')
const requireAdmin = customErrors.requireAdmin
/// ////////////////////////////////////////////

// get index of all rsvps
// must be admin
router.get('/rsvps', requireToken, (req, res, next) => {
  Rsvp.find()
    .then((rsvps) => {
      requireAdmin(req, rsvps)
    })
    .then((rsvps) => {
      // `rsvps` will be an array of Mongoose documents
      // we want to convert each one to a POJO, so we use `.map` to
      // apply `.toObject` to each one
      return rsvps.map((rsvp) => rsvp.toObject())
    })
  // respond with status 200 and JSON of the rsvps
    .then((rsvps) => res.status(200).json({ rsvps: rsvps }))
  // if an error occurs, pass it to the handler
    .catch(next)
})

// get user's rsvp
// a user should only be able to view their own rsvp
router.get('/rsvp/:id', requireToken, (req, res, next) => {
  delete req.body.example.owner
  Rsvp.findById(req.params.id)
    .then(handle404)
    .then((rsvp) => {
      // pass the `req` object and the Mongoose record to `requireOwnership`
      // it will throw an error if the current user isn't the owner
      requireOwnership(req, rsvp)

      // pass the result of Mongoose's `.update` to the next `.then`
      return rsvp
    })
    .then(rsvp => res.status(200).json({ rsvp: rsvp.toObject() }))
    .catch(next)
})

// make a new rsvp
router.post('/rsvps', requireToken, (req, res, next) => {
  // set owner of new rsvp to be current user
  req.body.rsvp.owner = req.user.id

  let temp = User.findById(req.user.id)
  temp.isRsvped = true

  Rsvp.create(req.body.rsvp)
  // respond to successful `create` with status 201 and JSON of new "rsvp"
    .then((rsvp) => {
      console.log(rsvp)
      console.log(temp)
      User.save(temp)
      return (rsvp)
    })
    .then((rsvp) => {
      res.status(201).json({ rsvp: rsvp.toObject() })
    })
    .catch(next)
})

// update a rsvp
router.patch('/rsvp/:id', requireToken, (req, res, next) => {
  // to stop a user from changing the owner of the rsvp by adding a new owner property we will remove it
  delete req.body.rsvp.owner

  Rsvp.findById(req.params.id)
    .then(handle404)
    .then(rsvp => {
      requireOwnership(req, rsvp)
      return rsvp.updateOne(req.body.rsvp)
    })
    .then(() => res.Status(204).json({ rsvp: rsvp.toObject() }))
})

// delete an rsvp
router.delete('/rsvp/:id', requireToken, (req, res, next) => {
  Rsvp.findById(req.params.id)
    .then(handle404)
    .then(rsvp => {
      requireOwnership(req, rsvp)
      rsvp.deleteOne()
      let temp = User.findById(req.user.id)
      temp.isRsvped = false
      User.save(temp)
    })
    .then(() => res.sendStatus(204))
    .catch(next)
})

module.exports = router
