const db = require('./db');

const Guest = {};

// Creates multiple guests for an event
Guest.createMany = async (eventId, guestsData) => {
  console.log("Attempting to create guests (Alternative Method) for eventId:", eventId);
  console.log("Received guestsData:", JSON.stringify(guestsData, null, 2));

  if (!eventId || isNaN(parseInt(eventId))) { /* ... validation ... */ }
  if (!guestsData || !Array.isArray(guestsData)) { /* ... validation ... */ }
  const validGuestsData = guestsData.filter(g => g && g.email && g.unique_token);
  if (validGuestsData.length === 0) { /* ... return if empty ... */ }

  // --- Alternative SQL Construction ---
  // 1. Create placeholders string: (?, ?, ?), (?, ?, ?), ...
  const placeholders = validGuestsData.map(() => '(?, ?, ?)').join(', ');

  // 2. Create a flat array of values: [eventId, email1, token1, eventId, email2, token2, ...]
  const flatValues = [];
  const currentEventId = parseInt(eventId, 10); // Ensure integer
  validGuestsData.forEach(guest => {
      flatValues.push(currentEventId, guest.email, guest.unique_token);
  });
  // --- End Alternative SQL Construction ---

  console.log("Formatted flat values for SQL:", JSON.stringify(flatValues, null, 2));

  const insertSql = `INSERT IGNORE INTO guests (event_id, email, unique_token) VALUES ${placeholders}`;

  try {
      // Pass the flat array of values directly
      const result = await db.query(insertSql, flatValues);

      console.log("Bulk insert result (Alternative Method):", result);
      return result;
  } catch (error) {
      console.error("SQL Error during bulk guest insert (Alternative Method):", error);
      console.error("SQL that failed:", insertSql);
      console.error("Parameters passed:", JSON.stringify(flatValues, null, 2));
      throw error;
  }
};

Guest.findByEventId = async (eventId) => {
  const sql = 'SELECT id, event_id, email, rsvp_status, name, attended, unique_token, invitation_sent FROM guests WHERE event_id = ?';

  return await db.query(sql, [eventId]);
};
 
Guest.findByToken = async (token) => {
  const sql = `
    SELECT
        g.id as guestId, g.email, g.unique_token, g.rsvp_status, g.name as guestName, g.attended,
        e.id as eventId, e.name as eventName, e.description as eventDescription, e.location as eventLocation, e.event_date
    FROM guests g
    JOIN events e ON g.event_id = e.id
    WHERE g.unique_token = ?`;
  const results = await db.query(sql, [token]);
  return results[0];
};

Guest.updateRsvp = async (token, rsvpData) => {
  // Generate barcode data here or in the controller before calling update
  const sql = 'UPDATE guests SET rsvp_status = ?, name = ?, other_details = ?, barcode_data = ? WHERE unique_token = ?';
  const result = await db.query(sql, [
    rsvpData.rsvp_status, // 'CONFIRMED' or 'DECLINED'
    rsvpData.name,
    JSON.stringify(rsvpData.other_details || {}), // Store as JSON string
    rsvpData.barcode_data, // e.g., the unique_token itself
    token
  ]);
  return result.affectedRows;
};

Guest.updateAttendance = async (barcodeData) => {
  // Assuming barcode_data stores the unique_token
  const sql = 'UPDATE guests SET attended = TRUE WHERE barcode_data = ? AND attended = FALSE'; // Check attended = FALSE to prevent multiple check-ins reporting success
  const result = await db.query(sql, [barcodeData]);
  return result.affectedRows; // 1 if updated, 0 if already attended or not found
};

Guest.findAttendedByEvent = async (eventId) => {
    const sql = 'SELECT id, email, name, unique_token FROM guests WHERE event_id = ? AND attended = TRUE AND feedback_sent = FALSE';
    return await db.query(sql, [eventId]);
};


Guest.markFeedbackSent = async (guestIds) => {
  console.log(`[DB markFeedbackSent] Received guest IDs to update: ${JSON.stringify(guestIds)}`);
  if (!guestIds || !Array.isArray(guestIds) || guestIds.length === 0) {
      console.log("[DB markFeedbackSent] No valid guest IDs provided, returning 0 affected rows.");
      return 0;
  }

  // --- الطريقة الجديدة لبناء الاستعلام والمعاملات ---
  // 1. إنشاء سلسلة من علامات الاستفهام '?, ?, ?' بناءً على طول المصفوفة
  const placeholders = guestIds.map(() => '?').join(', ');

  // 2. بناء جملة SQL النهائية
  const sql = `UPDATE guests SET feedback_sent = TRUE WHERE id IN (${placeholders})`;

  // 3. المعاملات الآن هي المصفوفة الأصلية مباشرة (مسطحة)
  const params = guestIds;
  // --- نهاية الطريقة الجديدة ---


  console.log(`[DB markFeedbackSent] Executing SQL: ${sql} with IDs: ${JSON.stringify(params)}`);

  try {
      // استخدم params مباشرة (المصفوفة المسطحة)
      const result = await db.query(sql, params);
      console.log(`[DB markFeedbackSent] SQL execution result: ${JSON.stringify(result)}`);
      return result.affectedRows !== undefined ? result.affectedRows : 0;
  } catch (error) {
      console.error(`[DB markFeedbackSent] SQL Error updating feedback_sent:`, error);
      throw error; // أعد رمي الخطأ
  }
};

Guest.markInvitationSent = async (guestIds) => {
  console.log(`[DB markInvitationSent] Received guest IDs to update: ${JSON.stringify(guestIds)}`);
  if (!guestIds || !Array.isArray(guestIds) || guestIds.length === 0) {
      console.log("[DB markInvitationSent] No valid guest IDs provided, returning 0 affected rows.");
      return 0;
  }

  // استخدام الطريقة المعدلة التي تعمل مع IN clause
  const placeholders = guestIds.map(() => '?').join(', ');
  const sql = `UPDATE guests SET invitation_sent = TRUE WHERE id IN (${placeholders})`;
  const params = guestIds;

  console.log(`[DB markInvitationSent] Executing SQL: ${sql} with IDs: ${JSON.stringify(params)}`);

  try {
      const result = await db.query(sql, params);
      console.log(`[DB markInvitationSent] SQL execution result: ${JSON.stringify(result)}`);
      return result.affectedRows !== undefined ? result.affectedRows : 0;
  } catch (error) {
      console.error(`[DB markInvitationSent] SQL Error updating invitation_sent:`, error);
      throw error;
  }
};


Guest.deleteGuest = async (guestId) => {
  const sql = 'DELETE FROM guests WHERE id = ?';
  const result = await db.query(sql, [guestId]);
  return result.affectedRows; 
},

module.exports = Guest;