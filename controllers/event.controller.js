const Event = require('../models/event.model');

exports.createEvent = async (req, res, next) => {
  try {
    // Add validation here (e.g., using express-validator)
    if (!req.body.name || !req.body.event_date) {
        return res.status(400).send({ message: "اسم الحدث والتاريخ مطلوبان." });
    }
    const newEvent = {
      admin_id: req.userId, // From authJwt middleware
      name: req.body.name,
      description: req.body.description || null,
      location: req.body.location || null,
      event_date: req.body.event_date,
    };
    const event = await Event.create(newEvent);
    res.status(201).send(event);
  } catch (error) {
    next(error);
  }
};

exports.getEvents = async (req, res, next) => {
  try {
    const events = await Event.findAllByAdmin(req.userId);
    res.status(200).send(events);
  } catch (error) {
    next(error);
  }
};

exports.getEventById = async (req, res, next) => {
  try {
    const event = await Event.findById(req.params.id, req.userId);
    if (!event) {
      return res.status(404).send({ message: 'لم يتم العثور على الحدث أو تم رفض الحضور.' });
    }
    res.status(200).send(event);
  } catch (error) {
    next(error);
  }
};

exports.updateEvent = async (req, res, next) => {
  try {
     if (!req.body.name || !req.body.event_date) {
        return res.status(400).send({ message: "اسم الحدث والتاريخ مطلوبان." });
    }
    const eventData = {
        name: req.body.name,
        description: req.body.description,
        location: req.body.location,
        event_date: req.body.event_date,
    };
    const affectedRows = await Event.update(req.params.id, eventData, req.userId);
    if (affectedRows === 0) {
      return res.status(404).send({ message: 'لم يتم العثور على الحدث أو لم يتم تحديثه.' });
    }
    res.status(200).send({ message: 'تم تحديث الحدث بنجاح.' });
  } catch (error) {
    next(error);
  }
};

exports.deleteEvent = async (req, res, next) => {
  try {
    const affectedRows = await Event.remove(req.params.id, req.userId);
    if (affectedRows === 0) {
      return res.status(404).send({ message: 'لم يتم العثور على الحدث أو لم يتم حذفه.' });
    }
    res.status(200).send({ message: 'تم حذف الحدث بنجاح.' }); // Or 204 No Content
  } catch (error) {
    // Handle potential foreign key constraint errors if needed
    next(error);
  }
};

// --- Add controllers for guest, checkin, feedback similarly ---
// guest.controller.js: addGuests, sendInvitations, getGuestRsvpDetails, submitRsvp, getGuestsByEvent
// checkin.controller.js: markAttendance
// feedback.controller.js: sendFeedbackRequests, submitFeedback, getFeedbackByEvent