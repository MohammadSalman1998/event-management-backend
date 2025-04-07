const transporter = require('../config/mail.config');
require('dotenv').config();

const sendEmail = async (to, subject, htmlContent) => {
  const mailOptions = {
    from: `"Your Event App" <${process.env.EMAIL_USER}>`, // Sender address
    to: to, // List of receivers (string or array)
    subject: subject, // Subject line
    html: htmlContent, // HTML body content
  };

  try {
    let info = await transporter.sendMail(mailOptions);
    console.log('Message sent: %s', info.messageId);
    return info;
  } catch (error) {
    console.error('Error sending email: %s', error);
    throw error; // Re-throw the error to be handled by the caller
  }
};

module.exports = { sendEmail };