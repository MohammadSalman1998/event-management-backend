const express = require('express');
const controller = require('../controllers/event.controller');
const feedbackController = require('../controllers/feedback.controller');
const { verifyToken, isAdmin } = require('../middleware/authJwt'); // Protect event routes
const router = express.Router();

// All event routes require admin authentication
router.use(verifyToken,isAdmin );

router.post('/', controller.createEvent);
router.get('/', controller.getEvents);
router.get('/:id', controller.getEventById);
router.put('/:id', controller.updateEvent);
router.delete('/:id', controller.deleteEvent);

router.post('/:eventId/send-feedback-requests', feedbackController.sendFeedbackRequests);
router.get('/:eventId/feedback', feedbackController.getFeedbackByEvent);

// Routes related to guests/feedback for a specific event will be handled in guest.routes etc.
// but potentially mounted under /events in server.js or routes/index.js

module.exports = router;