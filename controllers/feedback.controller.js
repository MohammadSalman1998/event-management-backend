const Guest = require('../models/guest.model');
const Feedback = require('../models/feedback.model');
const Event = require('../models/event.model');
const { sendEmail } = require('../services/email.service');
require('dotenv').config();

// Send feedback request emails to attended guests
// backend/controllers/feedback.controller.js

exports.sendFeedbackRequests = async (req, res, next) => {
    const eventId = req.params.eventId;
    console.log(`[Feedback Send] Starting process for eventId: ${eventId}`); // <-- Log Start
    try {
        const event = await Event.findById(eventId, req.userId);
         if (!event) {
             console.log(`[Feedback Send] Event not found or access denied for eventId: ${eventId}`);
            return res.status(404).send({ message: "لم يتم العثور على الحدث أو تم رفض الحضور." });
        }

        // الخطوة 1: البحث عن الحاضرين الذين لم يتلقوا التقييم
        const attendedGuests = await Guest.findAttendedByEvent(eventId);
        console.log(`[Feedback Send] Found ${attendedGuests.length} attended guests without feedback sent.`); // <-- Log Count

        if (!attendedGuests || attendedGuests.length === 0) {
            console.log(`[Feedback Send] No guests to send feedback requests to.`);
            return res.status(200).send({ message: "لم يتم العثور على الضيوف الحاضرين الذين لم يتلقوا طلب تقييم حتى الآن." });
        }

        let sentCount = 0;
        let errorCount = 0;
        const feedbackUrlBase = `${process.env.FRONTEND_URL}/feedback/`;
        const guestIdsToSend = []; // مصفوفة لتجميع IDs الضيوف الذين تم إرسال الإيميل لهم بنجاح

        // الخطوة 2: المرور على الضيوف وإرسال الإيميلات
        for (const guest of attendedGuests) {
             if (!guest.unique_token || !guest.id) { // التأكد من وجود ID و Token
                 console.warn(`[Feedback Send] Skipping guest due to missing token or ID: ${guest.email || 'Unknown'}`);
                 continue;
             }

            const feedbackLink = `${feedbackUrlBase}${guest.unique_token}`;
            const subject = `تقييمات حول ${event.name}`;
            const htmlContent = `
              <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; direction: rtl; text-align: right;">
                <h1 style="color: #007bff; margin-bottom: 20px;">شكرًا لحضوركم ${event.name}!</h1>
                <p style="margin-bottom: 15px;">نتمنى أن تكونوا قد استمتعتم بالفعالية.</p>
                <p style="margin-bottom: 15px;">يرجى تخصيص بعض الوقت لمشاركة تقييمكم من خلال النقر على الرابط أدناه:</p>
                <p style="margin-bottom: 25px;">
                  <a href="${feedbackLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                    ترك تقييم
                  </a>
                </p>
                <p style="color: #777; font-size: 0.9em;">تقييمكم قيّمة بالنسبة لنا!</p>
              </div>
            `;

             try {
                console.log(`[Feedback Send] Attempting to send email to: ${guest.email} (Guest ID: ${guest.id})`);
                await sendEmail(guest.email, subject, htmlContent);
                console.log(`[Feedback Send] Email sent successfully to: ${guest.email}`);
                sentCount++;
                guestIdsToSend.push(guest.id); // **أضف الـ ID فقط إذا نجح الإرسال**
            } catch (emailError) {
                console.error(`[Feedback Send] Failed to send feedback request to ${guest.email}:`, emailError);
                errorCount++;
                // **لا تقم بإضافة الـ ID هنا إذا فشل الإرسال**
            }
        }

        console.log(`[Feedback Send] Email Sending Summary - Sent: ${sentCount}, Failed: ${errorCount}`);
        console.log(`[Feedback Send] Guest IDs to mark as feedback_sent: ${JSON.stringify(guestIdsToSend)}`); // <-- Log IDs

        // الخطوة 3: تحديث قاعدة البيانات
        if (guestIdsToSend.length > 0) {
            try {
                console.log(`[Feedback Send] Attempting to update feedback_sent flag for ${guestIdsToSend.length} guests.`);
                const affectedRows = await Guest.markFeedbackSent(guestIdsToSend); // استدعاء دالة التحديث
                console.log(`[Feedback Send] Database update completed. Rows affected: ${affectedRows}`); // <-- Log Result
                 if (affectedRows !== guestIdsToSend.length) {
                     console.warn(`[Feedback Send] Warning: Number of affected rows (${affectedRows}) does not match the number of guests (${guestIdsToSend.length}) whose emails were sent successfully.`);
                 }
            } catch (dbError) {
                 console.error(`[Feedback Send] Error updating feedback_sent flag in database:`, dbError);
                 // أرسل رسالة خطأ جزئي للمستخدم إذا فشل تحديث قاعدة البيانات
                 return res.status(500).send({ message: `تم إرسال طلبات تقييم: ${sentCount}، فشل: ${errorCount}. ومع ذلك، فشل تحديث حالة الملاحظات في قاعدة البيانات. يرجى مراجعة السجلات.` });            }
        } else {
             console.log(`[Feedback Send] No guest IDs to update in the database (either no successful emails or no guests found initially).`);
        }

        res.status(200).send({ message: `تم إرسال طلبات التقييم: ${sentCount}، فشل: ${errorCount}. تم تحديث الحالة لـ ${guestIdsToSend.length} ضيفًا.` });
    } catch (error) {
        console.error(`[Feedback Send] General error in sendFeedbackRequests for eventId ${eventId}:`, error);
        next(error); // تمرير الخطأ لمعالج الأخطاء العام
    }
};

// Submit feedback
exports.submitFeedback = async (req, res, next) => {
     const token = req.params.token; // Assuming token identifies the guest
    const { rating, comment } = req.body;

    // Add validation for rating and comment
    if (rating === undefined || rating === null) {
        return res.status(400).send({ message: "التقييم مطلوب." });
    }

    try {
        // Find guest and associated event using the token
        const guestDetails = await Guest.findByToken(token); // Re-use this function
        if (!guestDetails || !guestDetails.guestId || !guestDetails.eventId) {
            return res.status(404).send({ message: 'رابط التقييمات غير صالح أو لم يتم العثور على الضيف.' });
        }

         // Optional: Check if feedback already submitted for this guest/event
        // const existingFeedback = await Feedback.findByGuestAndEvent(guestDetails.guestId, guestDetails.eventId);
        // if (existingFeedback) return res.status(400).send({ message: 'Feedback already submitted.'})

        const feedbackData = {
            guest_id: guestDetails.guestId,
            event_id: guestDetails.eventId,
            rating: parseInt(rating, 10),
            comment: comment || null
        };

        const feedback = await Feedback.create(feedbackData);
        res.status(201).send({ message: 'شكرا لتقييمك!', feedbackId: feedback.id });

    } catch (error) {
        next(error);
    }
};

// Get feedback for an event (Admin view)
exports.getFeedbackByEvent = async (req, res, next) => {
    const eventId = req.params.eventId;
    try {
        // Verify event ownership
        const event = await Event.findById(eventId, req.userId);
        if (!event) {
             return res.status(404).send({ message: "لم يتم العثور على الحدث أو تم رفض الحضور." });
        }

        const feedbackList = await Feedback.findByEvent(eventId);
        res.status(200).send(feedbackList);
    } catch (error) {
        next(error);
    }
};