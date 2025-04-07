const express = require('express');
const controller = require('../controllers/guest.controller');
const { verifyToken, isAdmin } = require('../middleware/authJwt');
const router = express.Router();

router.use(verifyToken,isAdmin );
// These routes are typically accessed by an authenticated admin
// They are mounted under /api/events in routes/index.js
router.post('/:eventId/guests', controller.addGuests);
router.post('/:eventId/send-invitations', controller.sendInvitations);
router.get('/:eventId/guests', controller.getGuestsByEvent);
router.delete('/:eventId/guests/:guestId', controller.deleteGuestById);


// Public routes for RSVP are defined in routes/index.js directly

module.exports = router;