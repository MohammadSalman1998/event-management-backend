const User = require('../models/user.model');

exports.createUser = async (req, res, next) => {
  try {
   
     if (!['ADMIN', 'SCANNER'].includes(req.body.role)) {
         return res.status(400).send({ message: "Invalid role specified." });
     }
     const newUser = { ...req.body }; // email, password, name, role
     const created = await User.create(newUser); // User.create يجب أن يتعامل مع التشفير
     res.status(201).send({ message: "User created successfully!", userId: created.id });
  } catch (error) {
      // ... (معالجة الأخطاء، خاصة تكرار الإيميل)
      next(error);
  }
};

exports.getAllUsers = async (req, res, next) => {
    try {
        const users = await User.findAll(); // يجب أن لا تعيد كلمة المرور
        res.status(200).send(users);
    } catch (error) {
        next(error);
    }
};

/**
 * تحديث دور مستخدم.
 */
exports.updateUserRole = async (req, res, next) => {
    const userIdToUpdate = parseInt(req.params.userId, 10);
    const { role: newRole } = req.body;
  
    console.log(`[API updateUserRole] Request to update user ID: ${userIdToUpdate} to role: ${newRole}`);
  
    // 1. التحقق من المدخلات
    if (!newRole || !['ADMIN', 'SCANNER'].includes(newRole)) {
      return res.status(400).send({ message: "Invalid or missing role. Must be 'ADMIN' or 'SCANNER'." });
    }
    if (isNaN(userIdToUpdate)) {
       return res.status(400).send({ message: "Invalid user ID." });
    }
  
    // 2. منع الأدمن من تغيير دوره إذا كان هو الأدمن الوحيد (اختياري لكن مهم)
    if (req.userId === userIdToUpdate && req.userRole === 'ADMIN' && newRole === 'SCANNER') {
        try {
            const allUsers = await User.findAll();
            const adminCount = allUsers.filter(u => u.role === 'ADMIN').length;
            if (adminCount <= 1) {
                console.warn(`[API updateUserRole] Attempt by last admin (ID: ${req.userId}) to change their own role to SCANNER.`);
                return res.status(403).send({ message: "Cannot change role of the last admin." });
            }
        } catch(countError) {
            return next(countError); // تمرير خطأ جلب المستخدمين
        }
    }
  
  
    try {
      // 3. تنفيذ التحديث
      const affectedRows = await User.updateRole(userIdToUpdate, newRole);
  
      if (affectedRows === 0) {
         console.log(`[API updateUserRole] User not found or role already set for ID: ${userIdToUpdate}`);
        return res.status(404).send({ message: "User not found or role was already set to this value." });
      }
  
      console.log(`[API updateUserRole] Role updated successfully for user ID: ${userIdToUpdate}`);
      res.status(200).send({ message: "User role updated successfully." });
  
    } catch (error) {
      console.error(`[API updateUserRole] Error:`, error);
      // التحقق من نوع الخطأ العام (مثلاً خطأ قاعدة بيانات)
      next(error); // تمرير الخطأ للمعالج العام
    }
  };
  
  
  /**
   * تحديث بيانات المستخدم (مثال: الاسم والإيميل).
   * **تنبيه:** لا يسمح بتحديث كلمة المرور عبر هذه الدالة.
   */
  exports.updateUserDetails = async (req, res, next) => {
      const userIdToUpdate = parseInt(req.params.userId, 10);
      const { name, email } = req.body; // الحصول فقط على الحقول المسموح بتعديلها
  
      console.log(`[API updateUserDetails] Request to update user ID: ${userIdToUpdate} with data:`, { name, email });
  
      if (isNaN(userIdToUpdate)) {
          return res.status(400).send({ message: "Invalid user ID." });
      }
  
      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (email !== undefined) updateData.email = email.trim().toLowerCase();
  
      if (Object.keys(updateData).length === 0) {
          return res.status(400).send({ message: "No valid fields provided for update (allowed: name, email)." });
      }
  
      try {
           // **التحقق من تكرار الإيميل (إذا تم تغييره)**
           if (updateData.email) {
              const existingUser = await User.findByEmail(updateData.email);
              // إذا وجد مستخدم بنفس الإيميل وهو *ليس* المستخدم الذي نحاول تعديله
              if (existingUser && existingUser.id !== userIdToUpdate) {
                   console.warn(`[API updateUserDetails] Email "${updateData.email}" already exists for user ID: ${existingUser.id}`);
                   return res.status(400).send({ message: `Failed! Email "${updateData.email}" is already in use.` });
              }
          }
  
          const affectedRows = await User.updateDetails(userIdToUpdate, updateData);
  
          if (affectedRows === 0) {
              console.log(`[API updateUserDetails] User not found or no changes made for ID: ${userIdToUpdate}`);
              // قد يكون المستخدم غير موجود أو البيانات المرسلة مطابقة للبيانات الحالية
              return res.status(404).send({ message: "User not found or no changes were necessary." });
          }
  
          console.log(`[API updateUserDetails] Details updated successfully for user ID: ${userIdToUpdate}`);
          res.status(200).send({ message: "User details updated successfully." });
  
      } catch (error) {
          console.error(`[API updateUserDetails] Error:`, error);
           // معالجة خطأ تكرار الإيميل إذا حدث أثناء عملية UPDATE نفسها (كخط دفاعي)
           if (error.code === 'ER_DUP_ENTRY') {
               return res.status(400).send({ message: `Failed! Email "${updateData.email}" is already in use.` });
           }
          next(error);
      }
  };
  
  
  /**
   * حذف مستخدم.
   */
  exports.deleteUser = async (req, res, next) => {
    const userIdToDelete = parseInt(req.params.userId, 10);
    const currentUserId = req.userId; // ID المستخدم الذي يقوم بالطلب (الأدمن)
  
    console.log(`[API deleteUser] Request by admin ID: ${currentUserId} to delete user ID: ${userIdToDelete}`);
  
     if (isNaN(userIdToDelete)) {
       return res.status(400).send({ message: "Invalid user ID." });
    }
  
    // 1. منع المستخدم من حذف نفسه
    if (userIdToDelete === currentUserId) {
       console.warn(`[API deleteUser] Admin (ID: ${currentUserId}) attempted to delete their own account.`);
      return res.status(403).send({ message: "You cannot delete your own account." });
    }
  
    // 2. منع حذف آخر أدمن (اختياري لكن مهم)
     try {
         const userToDelete = await User.findById(userIdToDelete);
         if (userToDelete && userToDelete.role === 'ADMIN') {
              const allUsers = await User.findAll();
              const adminCount = allUsers.filter(u => u.role === 'ADMIN').length;
              if (adminCount <= 1) {
                  console.warn(`[API deleteUser] Attempt to delete the last admin (ID: ${userIdToDelete}).`);
                  return res.status(403).send({ message: "Cannot delete the last admin account." });
              }
         } else if (!userToDelete) {
             // إذا لم يتم العثور على المستخدم أصلًا
              return res.status(404).send({ message: "User not found." });
         }
  
          // 3. تنفيذ الحذف
          const affectedRows = await User.remove(userIdToDelete);
  
          if (affectedRows === 0) {
              // قد يكون المستخدم تم حذفه للتو في طلب آخر
               console.log(`[API deleteUser] User not found during delete operation for ID: ${userIdToDelete}`);
               return res.status(404).send({ message: "User not found." });
          }
  
          console.log(`[API deleteUser] User ID: ${userIdToDelete} deleted successfully by admin ID: ${currentUserId}`);
          // 204 No Content هي استجابة شائعة للحذف الناجح، أو يمكنك إرسال 200 مع رسالة
          res.status(200).send({ message: "User deleted successfully." });
          // أو res.status(204).send();
  
     } catch (error) {
        console.error(`[API deleteUser] Error deleting user ID ${userIdToDelete}:`, error);
        next(error);
     }
  };