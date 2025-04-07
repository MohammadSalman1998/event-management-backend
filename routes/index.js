const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const eventRoutes = require('./event.routes');
const guestRoutes = require('./guest.routes');
const checkinRoutes = require('./checkin.routes');
const feedbackRoutes = require('./feedback.routes');
const userRoutes = require('./user.routes');

router.use('/auth', authRoutes);
router.use('/events', eventRoutes); 
router.use('/checkin', checkinRoutes); 
router.use('/feedback', feedbackRoutes); 
router.use('/users', userRoutes); 


router.use('/events', guestRoutes);

// Public RSVP route (doesn't need auth)
const guestController = require('../controllers/guest.controller'); 
router.get('/rsvp/:token', guestController.getGuestRsvpDetails);
router.post('/rsvp/:token', guestController.submitRsvp);


module.exports = router;