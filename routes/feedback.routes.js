const express = require('express');
const controller = require('../controllers/feedback.controller');
const { verifyToken, isAdmin } = require('../middleware/authJwt');
// const { verifyToken } = require('../middleware/authJwt'); // For admin actions
const router = express.Router();


// Admin: Send feedback requests for an event
// POST /api/events/:eventId/send-feedback-requests (Mounted under events) - Move logic call if needed
// const eventController = require('../controllers/event.controller'); // Need event controller for this pattern
// router.post('/:eventId/send-feedback-requests', verifyToken, controller.sendFeedbackRequests);


// Admin: Get feedback for an event
// GET /api/events/:eventId/feedback (Mounted under events)
// router.get('/events/:eventId/feedback', verifyToken, controller.getFeedbackByEvent);


// Public: Submit feedback using token from email link
// POST /api/feedback/:token
router.use(verifyToken,isAdmin );
router.post('/:token',  controller.submitFeedback);


module.exports = router;