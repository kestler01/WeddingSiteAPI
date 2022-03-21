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
// const requireOwnership = customErrors.requireOwnership

// passing this as a second argument to `router.<verb>` will make it
// so that a token MUST be passed for that route to be available
// it will also set `req.user`
const requireToken = passport.authenticate('bearer', { session: false })

// instantiate a router (mini app that only handles routes)
const router = express.Router()

// pull in Mongoose models
const User = require('../models/user') // to update isRsvped
const Rsvp = require('../models/rsvp.js')
// const mongoose = require('mongoose')
const requireAdmin = customErrors.requireAdmin

/// ////////////////////////////////////////////

// get index of all rsvps
// must be admin
router.get('/rsvps', requireToken, (req, res, next) => {
  Rsvp.find()
    .then((rsvps) => {
      requireAdmin(req, rsvps) // req body needs to contain user object with isAdmin=true will return the 2nd arg if true
      console.log(rsvps)
      return (rsvps)
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
router.get('/rsvp', requireToken, (req, res, next) => {
  Rsvp.find({owner: req.user.id})
    .then(handle404)
    .then((rsvp) => {
      // requireOwnership(req, rsvp) shouldn't be necessary since we are using the user to get the rsvp they own already
      // address teh test environment edge case of multiple rsvps
      if (Array.isArray(rsvp)) {
        rsvp = rsvp[0]
      }
      return rsvp
    })
    .then(rsvp => res.status(200).json({ rsvp: rsvp.toObject() }))
    .catch(next)
})

// make a new rsvp
router.post('/rsvp', requireToken, async (req, res, next) => {
  // set owner of new rsvp to be current user
  req.body.rsvp.owner = req.user.id
  console.log(req.user.id)
  Rsvp.create(req.body.rsvp)
  // respond to successful `create` with status 201 and JSON of new "rsvp"
    // .then((rsvp) => {
    //   // console.log(rsvp)
    //   // console.log(user)
    //   // return user.save()
    // })
    .then(() => { return User.findById(req.user.id) })// *
    .then((user) => {
      user.isRsvped = true
      return user.save()
    })
    .then((user) => {
      // console.log(user)
      // console.log('about to send status')
      res.sendStatus(201)// .json({ user: user.toObject() })// can cut this part of the response since the client already has all the data, after a 201 it should update directly without the json object bloat
    })
    .catch(next)
})

// update a rsvp
router.patch('/rsvp', requireToken, (req, res, next) => {
  // to stop a user from changing the owner of the rsvp by adding a new owner property we will remove it
  delete req.body.rsvp.owner
  // console.log(req.user)
  Rsvp.find({ owner: req.user.id })
    .then((rsvp) => {
      // console.log(rsvp)// RSVP IS an array!
      if (Array.isArray(rsvp)) {
        // if we there are multiple rsvps for a user (which should never happen) get only the first one
        rsvp = rsvp[0]
      }
      return rsvp
    })
    .then(handle404)
    .then(rsvp => {
      console.log('rsvp.owner?', rsvp) // undefined?
      // const owner = resource.owner._id ? resource.owner._id : resource.owner
      console.log(req.user)
      console.log(req.body.rsvp)
      // requireOwnership(req, rsvp)
      return rsvp.updateOne(req.body.rsvp)
    })
    .then(() => res.sendStatus(204)) // .json({ rsvp: rsvp.toObject() }))can cut this part of the response since the client already has all the data, after a 201 it should update directly without the json object bloat
    .catch(next)
})

// delete an rsvp
router.delete('/rsvp', requireToken, (req, res, next) => {
  Rsvp.find({ owner: req.user.id })
    .then(handle404)
    .then((rsvp) => {
      if (Array.isArray(rsvp)) { // to address dev edge case where we have a test user that has many rsvps, which shouldn't happen in dev
        rsvp = rsvp[0]
      }
      return rsvp
    })
    .then((rsvp) => {
      // requireOwnership(req, rsvp)
      rsvp.deleteOne()
    })
    // return user.save()
    .then(() => { return User.findById(req.user.id) })
    .then((user) => {
      user.isRsvped = false
      return user.save()
    })
    .then(() => res.sendStatus(204))
    .catch(next)
})

module.exports = router
