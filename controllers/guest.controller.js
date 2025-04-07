const Guest = require("../models/guest.model");
const Event = require("../models/event.model"); // Needed to verify event ownership
const { v4: uuidv4 } = require("uuid");
const { sendEmail } = require("../services/email.service");
const { generateQRCode } = require("../services/qr.service");
require("dotenv").config();

// Add guests to an event
exports.addGuests = async (req, res, next) => {
  const eventId = req.params.eventId;
  const emails = req.body.emails; // Expect an array of emails

  if (!emails || !Array.isArray(emails) || emails.length === 0) {
    return res
      .status(400)
      .send({ message: "مجموعة رسائل البريد الإلكتروني مطلوبة." });
  }

  try {
    // Optional: Verify the event belongs to the logged-in admin
    const event = await Event.findById(eventId, req.userId);
    if (!event) {
      return res
        .status(404)
        .send({ message: "لم يتم العثور على الحدث أو تم رفض الحضور." });
    }

    const guestsData = emails
      .filter((email) => typeof email === "string" && email.includes("@")) // Basic email validation
      .map((email) => ({
        email: email.trim(),
        unique_token: uuidv4(), // Generate a unique token for each guest
      }));

    if (guestsData.length === 0) {
      return res
        .status(400)
        .send({ message: "لم يتم تقديم أي رسائل بريد إلكتروني صالحة." });
    }

    const result = await Guest.createMany(eventId, guestsData);

    res.status(201).send({
      message: `${result.affectedRows} تمت إضافة الضيوف بنجاح (تم تجاهل التكرارات).`,
      // You might want to return the actual list of added guests with their tokens
    });
  } catch (error) {
    next(error);
  }
};

// Send invitation emails
exports.sendInvitations = async (req, res, next) => {
  const eventId = req.params.eventId;
  console.log(`[Invitation Send] Starting process for eventId: ${eventId}`);
  try {
    const event = await Event.findById(eventId, req.userId);
    if (!event) {
      console.log(
        `[Invitation Send] Event not found or access denied for eventId: ${eventId}`
      );
      return res
        .status(404)
        .send({ message: "لم يتم العثور على الحدث أو تم رفض الحضور." });
    }

    // الخطوة 1: جلب *جميع* الضيوف للحدث مع حالة إرسال الدعوة
    const guests = await Guest.findByEventId(eventId);
    console.log(
      `[Invitation Send] Found ${guests.length} total guests for event.`
    );

    if (!guests || guests.length === 0) {
      console.log(`[Invitation Send] No guests found to potentially invite.`);
      return res
        .status(404)
        .send({ message: "لم يتم العثور على ضيوف لهذا الحدث." });
    }

    let sentCount = 0;
    let skippedCount = 0; // عدد الذين تم تخطيهم لأن الدعوة أرسلت بالفعل
    let errorCount = 0;
    const frontendRsvpUrl = `${process.env.FRONTEND_URL}/rsvp/`;
    const guestIdsToUpdate = []; // لتجميع IDs الذين تم إرسال الدعوة لهم الآن

    // الخطوة 2: المرور على الضيوف والتحقق قبل الإرسال
    for (const guest of guests) {
      // **** التحقق من العلم الجديد ****
      if (guest.invitation_sent) {
        console.log(
          `[Invitation Send] Skipping guest ${guest.email} (ID: ${guest.id}) - Invitation already sent.`
        );
        skippedCount++;
        continue; // انتقل للضيف التالي
      }

      if (!guest.unique_token || !guest.id) {
        console.warn(
          `[Invitation Send] Skipping guest due to missing token or ID: ${
            guest.email || "Unknown"
          }`
        );
        continue;
      }

      const rsvpLink = `<span class="math-inline">\{frontendRsvpUrl\}</span>{guest.unique_token}`;
      const subject = `دعوة: ${event.name}`;
      const htmlContent = `
              <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; direction: rtl; text-align: right;">
                <h1 style="color: #007bff; margin-bottom: 20px;">أنتم مدعوون!</h1>
                <p style="margin-bottom: 15px;">أنتم مدعوون لحضور فعالية: <strong>${
                  event.name
                }</strong>.</p>
                <p style="margin-bottom: 10px;"><strong>التاريخ:</strong> ${new Date(
                  event.event_date
                ).toLocaleString()}</p>
                <p style="margin-bottom: 10px;"><strong>الموقع:</strong> ${
                  event.location || "سيتم تحديده لاحقًا"
                }</p>
                <p style="margin-bottom: 15px;">${event.description || ""}</p>
                <p style="margin-bottom: 15px;">يرجى النقر على الرابط أدناه لتأكيد حضوركم:</p>
                <p style="margin-bottom: 25px;">
                  <a href="${rsvpLink}" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                    تأكيد الحضور
                  </a>
                </p>
                <p style="color: #777; font-size: 0.9em;">نتطلع إلى رؤيتكم هناك!</p>
              </div>
            `;

      try {
        console.log(
          `[Invitation Send] Attempting to send invitation to: ${guest.email} (Guest ID: ${guest.id})`
        );
        await sendEmail(guest.email, subject, htmlContent);
        console.log(
          `[Invitation Send] Invitation sent successfully to: ${guest.email}`
        );
        sentCount++;
        guestIdsToUpdate.push(guest.id); // أضف الـ ID لتحديث حالته
      } catch (emailError) {
        console.error(
          `[Invitation Send] Failed to send invitation to ${guest.email}:`,
          emailError
        );
        errorCount++;
      }
    } // نهاية الحلقة for

    console.log(
      `[Invitation Send] Sending Summary - Sent Now: ${sentCount}, Skipped (already sent): ${skippedCount}, Failed: ${errorCount}`
    );
    console.log(
      `[Invitation Send] Guest IDs to mark as invitation_sent: ${JSON.stringify(
        guestIdsToUpdate
      )}`
    );

    // الخطوة 3: تحديث حالة invitation_sent في قاعدة البيانات
    if (guestIdsToUpdate.length > 0) {
      try {
        console.log(
          `[Invitation Send] Attempting to update invitation_sent flag for ${guestIdsToUpdate.length} guests.`
        );
        const affectedRows = await Guest.markInvitationSent(guestIdsToUpdate); // *** استدعاء الدالة الجديدة ***
        console.log(
          `[Invitation Send] Database update completed. Rows affected: ${affectedRows}`
        );
        if (affectedRows !== guestIdsToUpdate.length) {
          console.warn(
            `[Invitation Send] Warning: Number of affected rows (<span class="math-inline">\{affectedRows\}\) does not match the number of guests \(</span>{guestIdsToUpdate.length}) whose emails were sent successfully.`
          );
        }
      } catch (dbError) {
        console.error(
          `[Invitation Send] Error updating invitation_sent flag in database:`,
          dbError
        );
        // أبلغ المستخدم بحدوث خطأ في التحديث لكن الإيميلات قد أرسلت
        return res
          .status(500)
          .send({
            message: `عدد الدعوات المرسلة: ${sentCount}, عدد الدعوات المتخطاة: ${skippedCount}, عدد الدعوات الفاشلة: ${errorCount}. مع ذلك، تعذر تحديث حالة الدعوة في قاعدة البيانات. يُرجى مراجعة السجلات.`,
          });
      }
    } else {
      console.log(
        `[Invitation Send] No new invitations were sent, no database update needed.`
      );
    }

    res
      .status(200)
      .send({
        message: `اكتملت عملية إرسال الدعوة - ​​تم الإرسال الآن: ${sentCount}, تم تخطيها (تم الإرسال بالفعل):  ${skippedCount}, فشل: ${errorCount}. تم ​​تحديث الحالة لـ  ${guestIdsToUpdate.length} ضيوف.`,
      });
  } catch (error) {
    console.error(
      `[Invitation Send] General error in sendInvitations for eventId ${eventId}:`,
      error
    );
    next(error);
  }
};

// exports.sendInvitations = async (req, res, next) => {
//     const eventId = req.params.eventId;
//     try {
//          // Optional: Verify the event belongs to the logged-in admin
//         const event = await Event.findById(eventId, req.userId);
//         if (!event) {
//             return res.status(404).send({ message: "لم يتم العثور على الحدث أو تم رفض الحضور." });
//         }

//         const guests = await Guest.findByEventId(eventId); // Get guests with PENDING status? Add filter if needed.

//         if (!guests || guests.length === 0) {
//             return res.status(404).send({ message: 'لم يتم العثور على ضيوف لدعوتهم لهذا الحدث.' });
//         }

//         let sentCount = 0;
//         let errorCount = 0;
//         const frontendRsvpUrl = `${process.env.FRONTEND_URL}/rsvp/`; // Base URL for RSVP

//         for (const guest of guests) {
//             if (!guest.unique_token) continue; // Skip if token is missing

//             const rsvpLink = `${frontendRsvpUrl}${guest.unique_token}`;
//             const subject = `دعوة: ${event.name}`;
//             const htmlContent = `
//               <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; direction: rtl; text-align: right;">
//                 <h1 style="color: #007bff; margin-bottom: 20px;">أنتم مدعوون!</h1>
//                 <p style="margin-bottom: 15px;">أنتم مدعوون لحضور فعالية: <strong>${event.name}</strong>.</p>
//                 <p style="margin-bottom: 10px;"><strong>التاريخ:</strong> ${new Date(event.event_date).toLocaleString()}</p>
//                 <p style="margin-bottom: 10px;"><strong>الموقع:</strong> ${event.location || 'سيتم تحديده لاحقًا'}</p>
//                 <p style="margin-bottom: 15px;">${event.description || ''}</p>
//                 <p style="margin-bottom: 15px;">يرجى النقر على الرابط أدناه لتأكيد حضوركم:</p>
//                 <p style="margin-bottom: 25px;">
//                   <a href="${rsvpLink}" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
//                     تأكيد الحضور
//                   </a>
//                 </p>
//                 <p style="color: #777; font-size: 0.9em;">نتطلع إلى رؤيتكم هناك!</p>
//               </div>
//             `;

//             try {
//                 await sendEmail(guest.email, subject, htmlContent);
//                 sentCount++;
//                 // Optional: Update guest status to 'INVITED' if using such a status
//             } catch (emailError) {
//                 console.error(`Failed to send invitation to ${guest.email}:`, emailError);
//                 errorCount++;
//             }
//         }

//         res.status(200).send({ message: `تم إرسال الدعوات: ${sentCount}، فشل: ${errorCount}` });

//     } catch (error) {
//         next(error);
//     }
// };

// Get details for RSVP page
exports.getGuestRsvpDetails = async (req, res, next) => {
  const token = req.params.token;
  try {
    const details = await Guest.findByToken(token);
    if (!details) {
      return res
        .status(404)
        .send({ message: "لم يتم العثور على الدعوة أو انتهت صلاحيتها." });
    }
    // Don't send sensitive guest info like id here if not needed by frontend
    const responseData = {
      event: {
        id: details.eventId,
        name: details.eventName,
        description: details.eventDescription,
        location: details.eventLocation,
        date: details.event_date,
      },
      guest: {
        email: details.email, // Maybe pre-fill email
        status: details.rsvp_status,
      },
    };
    res.status(200).send(responseData);
  } catch (error) {
    next(error);
  }
};

// Submit RSVP confirmation
exports.submitRsvp = async (req, res, next) => {
  const token = req.params.token;
  const { name, status } = req.body; // Expect 'CONFIRMED' or 'DECLINED' status

  if (
    !name ||
    !status ||
    !["CONFIRMED", "DECLINED"].includes(status.toUpperCase())
  ) {
    return res
      .status(400)
      .send({ message: "الاسم والحالة الصحيحة (مؤكد/مرفوض) مطلوبان." });
  }

  try {
    // Verify token exists first
    const guest = await Guest.findByToken(token);
    if (!guest) {
      return res
        .status(404)
        .send({ message: "لم يتم العثور على الدعوة أو انتهت صلاحيتها." });
    }
    if (guest.rsvp_status !== "PENDING") {
      // Or allow re-confirmation? Depends on requirements.
      // return res.status(400).send({ message: 'RSVP already submitted.' });
    }

    let qrCodeDataURL = null;
    const barcodeData = guest.unique_token; // Use the unique token for the QR code content

    if (status.toUpperCase() === "CONFIRMED") {
      try {
        qrCodeDataURL = await generateQRCode(barcodeData);
      } catch (qrError) {
        console.error("QR Code generation failed:", qrError);
        // Decide if RSVP should fail if QR fails
        return res
          .status(500)
          .send({ message: "فشل إنشاء رمز الاستجابة السريعة" });
      }
    }

    const rsvpData = {
      rsvp_status: status.toUpperCase(),
      name: name,
      other_details: req.body.other_details || {}, // Optional details
      barcode_data: barcodeData, // Store the data used for the QR code
    };

    const affectedRows = await Guest.updateRsvp(token, rsvpData);

    if (affectedRows === 0) {
      return res
        .status(404)
        .send({ message: "فشل تحديث الرد. قد تكون الدعوة غير صالحة." });
    }

    const responsePayload = {
      message: `تم الرد بنجاح ${status.toLowerCase()}.`,
    };
    let qrCodeDataForEmail = null; // لتخزين بيانات QR للإيميل

    if (status.toUpperCase() === "CONFIRMED") {
      try {
        // استخدم التوكن أو أي معرف فريد كبيانات للباركود
        const barcodeData = guest.unique_token;
        // قم بإنشاء QR Code كـ Data URL
        const qrCodeDataURL = await generateQRCode(barcodeData);
        responsePayload.qrCode = qrCodeDataURL; // لإرساله للـ Frontend للعرض الفوري
        qrCodeDataForEmail = qrCodeDataURL; // استخدمه للإيميل

        // تخزين barcodeData في قاعدة البيانات (إذا لم يتم تخزينه أثناء updateRsvp)
        // await Guest.storeBarcodeData(token, barcodeData); // قد تحتاج لدالة كهذه
      } catch (qrError) {
        console.error("QR Code generation failed:", qrError);
        // يمكنك تقرير ما إذا كنت سترسل الإيميل بدون QR أو تعتبر العملية فشلت
      }
    }

    // إرسال إيميل التأكيد إذا تم التأكيد وكان هناك بيانات QR
    if (status.toUpperCase() === "CONFIRMED" && qrCodeDataForEmail) {
      try {
        const eventDetails = await Guest.findByToken(token); // أعد جلب التفاصيل أو استخدم ما هو متاح
        const subject = `تأكيد حضوركم لـ ${eventDetails.eventName}`;
        const htmlContent = `
              <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; direction: rtl; text-align: right;">
                <h1 style="color: #28a745; margin-bottom: 20px;">تم استلام تأكيد حضوركم!</h1>
                <p style="margin-bottom: 15px;">شكرًا لك، <span style="font-weight: bold;">${name}</span>! تم تأكيد حضوركم لفعالية <strong>${
          eventDetails.eventName
        }</strong>.</p>
                <p style="margin-bottom: 10px;"><strong>التاريخ:</strong> ${new Date(
                  eventDetails.event_date
                ).toLocaleString()}</p>
                <p style="margin-bottom: 10px;"><strong>الموقع:</strong> ${
                  eventDetails.eventLocation || "سيتم تحديده لاحقًا"
                }</p>
                <p style="margin-bottom: 15px;">يرجى إبراز رمز الاستجابة السريعة عند الدخول:</p>
                <img src="${qrCodeDataForEmail}" alt="رمز الاستجابة السريعة الخاص بكم" style="max-width: 200px; display: block; margin: 10px auto;" />
                <p style="color: #777; font-size: 0.9em;">نراكم هناك!</p>
              </div>
            `;

        await sendEmail(guest.email, subject, htmlContent);
      } catch (emailError) {
        console.error(
          `Failed to send confirmation email to ${guest.email}:`,
          emailError
        );
      }
    } else if (status.toUpperCase() === "DECLINED") {
    }

    res.status(200).send(responsePayload);
  } catch (error) {
    next(error);
  }
};

// Get guest list for an event (Admin view)
exports.getGuestsByEvent = async (req, res, next) => {
  const eventId = req.params.eventId;
  try {
    // Optional: Verify the event belongs to the logged-in admin
    const event = await Event.findById(eventId, req.userId);
    if (!event) {
      return res
        .status(404)
        .send({ message: "لم يتم العثور على الحدث أو تم رفض الحضور." });
    }
    const guests = await Guest.findByEventId(eventId);
    res.status(200).send(guests);
  } catch (error) {
    next(error);
  }
};

exports.deleteGuestById = async (req, res, next) => {
  const guestId = req.params.guestId;
  try {
    const affectedRows = await Guest.deleteGuest(guestId);
    if (affectedRows > 0) {
      res
        .status(200)
        .send({ message: `تم حذف الضيف ذو المعرف ${guestId} بنجاح.` });
    } else {
      res
        .status(404)
        .send({ message: `لم يتم العثور على الضيف ذو المعرف ${guestId}.` });
    }
  } catch (error) {
    next(error);
  }
};
