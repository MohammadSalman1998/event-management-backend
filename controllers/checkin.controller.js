const Guest = require('../models/guest.model');

exports.markAttendance = async (req, res, next) => {
    const { barcodeData } = req.body; // Expecting the data scanned from the QR code

    if (!barcodeData) {
        return res.status(400).send({ message: "بيانات الباركود مطلوبة." });
    }

    try {
        // Here, barcodeData is assumed to be the guest's unique_token
        // You might need to add logic to find the associated event if needed
        // Or maybe the check-in page knows the event ID already.

        // Attempt to update attendance
        const affectedRows = await Guest.updateAttendance(barcodeData);

        if (affectedRows === 1) {
            // Successfully checked in
            // Optional: Find guest details to return more info
             const guest = await Guest.findByToken(barcodeData); // Reusing findByToken
            res.status(200).send({
                message: `تم تسجيل الحضور بنجاح لـ ${guest ? guest.guestName || guest.email : 'ضيف'}.`,
                guestName: guest ? guest.guestName : null,
                guestEmail: guest ? guest.email : null,
            });
        } else {
            // Check if already attended or invalid token
            const guest = await Guest.findByToken(barcodeData);
            if (guest && guest.attended) {
                res.status(409).send({ // 409 Conflict is suitable for already checked-in
                     message: `الضيف ${guest.guestName || guest.email} تم تسجيل حضوره مسبقا.`,
                     guestName: guest.guestName,
                     guestEmail: guest.email,
                     alreadyCheckedIn: true
                 });
            } else {
                 res.status(404).send({ message: "فشل تسجيل الحضور. رمز الباركود غير صالح أو لم يتم العثور على الضيف." });
            }
        }
    } catch (error) {
        next(error);
    }
};