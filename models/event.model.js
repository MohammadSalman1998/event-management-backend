const db = require('./db');

const Event = {};

Event.create = async (newEvent) => {
  const sql = 'INSERT INTO events (admin_id, name, description, location, event_date) VALUES (?, ?, ?, ?, ?)';
  const result = await db.query(sql, [newEvent.admin_id, newEvent.name, newEvent.description, newEvent.location, newEvent.event_date]);
  return { id: result.insertId, ...newEvent };
};

Event.findAllByAdmin = async (adminId) => {
  const sql = 'SELECT * FROM events WHERE admin_id = ? ORDER BY event_date DESC';
  return await db.query(sql, [adminId]);
};

Event.findById = async (id, adminId) => {
    // Ensure admin owns the event or adjust logic as needed
  const sql = 'SELECT * FROM events WHERE id = ? AND admin_id = ?';
  const results = await db.query(sql, [id, adminId]);
  return results[0];
};

Event.update = async (id, eventData, adminId) => {
  const sql = 'UPDATE events SET name = ?, description = ?, location = ?, event_date = ? WHERE id = ? AND admin_id = ?';
  const result = await db.query(sql, [eventData.name, eventData.description, eventData.location, eventData.event_date, id, adminId]);
  return result.affectedRows; // Returns number of rows updated (should be 1 or 0)
};

Event.remove = async (id, adminId) => {
  const sql = 'DELETE FROM events WHERE id = ? AND admin_id = ?';
  const result = await db.query(sql, [id, adminId]);
  return result.affectedRows;
};

module.exports = Event;