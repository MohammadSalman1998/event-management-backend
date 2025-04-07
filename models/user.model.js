const db = require('./db');
const bcrypt = require('bcryptjs');

const User = {};


User.create = async (newUser) => {
  const hashedPassword = await bcrypt.hash(newUser.password, 8);
  const sql = 'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)';
  const result = await db.query(sql, [newUser.email, hashedPassword, newUser.name, newUser.role || 'SCANNER']); 
  return { id: result.insertId, email: newUser.email, name: newUser.name };
};


User.findByEmail = async (email) => {
  const sql = 'SELECT * FROM users WHERE email = ?';
  const results = await db.query(sql, [email]);
  return results[0];
};


User.findById = async (id) => {
  const sql = 'SELECT id, email, name, role, createdAt FROM users WHERE id = ?';
  const results = await db.query(sql, [id]);
  return results[0];
};

User.findAll = async () => {
  const sql = 'SELECT id, email, name, role, createdAt FROM users ORDER BY createdAt DESC';
  return await db.query(sql);
};


/**
 * تحديث دور مستخدم معين.
 * @param {number} userId - معرف المستخدم.
 * @param {string} newRole - الدور الجديد ('ADMIN' or 'SCANNER').
 * @returns {Promise<number>} - عدد الصفوف المتأثرة (0 أو 1).
 */
User.updateRole = async (userId, newRole) => {
  // التحقق الأساسي من قيمة الدور (يمكن تحسينه في الـ controller)
  if (!['ADMIN', 'SCANNER'].includes(newRole)) {
    throw new Error("Invalid role specified.");
  }
  const sql = 'UPDATE users SET role = ? WHERE id = ?';
  console.log(`[DB User.updateRole] Executing: ${sql} with Role: ${newRole}, ID: ${userId}`);
  try {
    const result = await db.query(sql, [newRole, userId]);
    console.log(`[DB User.updateRole] Result: ${JSON.stringify(result)}`);
    return result.affectedRows;
  } catch (error) {
    console.error(`[DB User.updateRole] Error:`, error);
    throw error;
  }
};

/**
 * تحديث بيانات مستخدم (مثال: الاسم والإيميل).
 * **تنبيه:** تحديث الإيميل يتطلب التحقق من عدم تكراره.
 * **تنبيه:** لا تقم بتضمين تحديث كلمة المرور هنا لدواعي أمنية.
 * @param {number} userId - معرف المستخدم.
 * @param {object} userData - كائن يحتوي على البيانات المراد تحديثها (e.g., { name: '...', email: '...' }).
 * @returns {Promise<number>} - عدد الصفوف المتأثرة.
 */
User.updateDetails = async (userId, userData) => {
  // بناء جملة SET بشكل ديناميكي بناءً على البيانات الموجودة
  const fieldsToUpdate = [];
  const values = [];

  if (userData.name !== undefined) {
    fieldsToUpdate.push('name = ?');
    values.push(userData.name);
  }
  if (userData.email !== undefined) {
     // **تحذير:** يجب التحقق من أن الإيميل الجديد غير مستخدم لمستخدم آخر *قبل* تنفيذ هذا التحديث (في الـ controller).
    fieldsToUpdate.push('email = ?');
    values.push(userData.email);
  }
  // يمكنك إضافة حقول أخرى هنا (باستثناء كلمة المرور)

  if (fieldsToUpdate.length === 0) {
    console.log("[DB User.updateDetails] No valid fields provided for update.");
    return 0; // لا يوجد شيء لتحديثه
  }

  values.push(userId); // إضافة userId في النهاية لشرط WHERE

  const sql = `UPDATE users SET ${fieldsToUpdate.join(', ')} WHERE id = ?`;
  console.log(`[DB User.updateDetails] Executing: ${sql} with Values: ${JSON.stringify(values)}`);

  try {
      // **تنبيه:** يجب معالجة خطأ تكرار الإيميل (ER_DUP_ENTRY) بشكل خاص في الـ controller إذا حدث.
    const result = await db.query(sql, values);
    console.log(`[DB User.updateDetails] Result: ${JSON.stringify(result)}`);
    return result.affectedRows;
  } catch (error) {
     console.error(`[DB User.updateDetails] Error:`, error);
     throw error;
  }
};


/**
 * حذف مستخدم معين.
 * @param {number} userId - معرف المستخدم المراد حذفه.
 * @returns {Promise<number>} - عدد الصفوف المتأثرة (0 أو 1).
 */
User.remove = async (userId) => {
  const sql = 'DELETE FROM users WHERE id = ?';
  console.log(`[DB User.remove] Executing: ${sql} with ID: ${userId}`);
  try {
    const result = await db.query(sql, [userId]);
    console.log(`[DB User.remove] Result: ${JSON.stringify(result)}`);
    return result.affectedRows;
  } catch (error) {
     console.error(`[DB User.remove] Error:`, error);
     throw error;
  }
};




module.exports = User;