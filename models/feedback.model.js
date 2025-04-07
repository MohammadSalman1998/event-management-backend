const db = require('./db');

const Feedback = {};

Feedback.create = async (feedbackData) => {
    // Assume feedbackData contains guest_id, event_id, rating, comment
  const sql = 'INSERT INTO feedback (guest_id, event_id, rating, comment) VALUES (?, ?, ?, ?)';
  const result = await db.query(sql, [feedbackData.guest_id, feedbackData.event_id, feedbackData.rating, feedbackData.comment]);
  return { id: result.insertId, ...feedbackData };
};

Feedback.findByEvent = async (eventId) => {
  const sql = `
    SELECT f.id, f.rating, f.comment, f.createdAt, g.name as guestName, g.email as guestEmail
    FROM feedback f
    JOIN guests g ON f.guest_id = g.id
    WHERE f.event_id = ?
    ORDER BY f.createdAt DESC`;
  return await db.query(sql, [eventId]);
};

module.exports = Feedback;