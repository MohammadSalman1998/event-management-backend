const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587', 10), // Ensure port is a number
  secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  // Optional: Add TLS configuration if needed, e.g., for self-signed certs
  // tls: {
  //   rejectUnauthorized: false // Use only for development/testing if necessary
  // }
});

// Verify connection configuration during startup (optional but recommended)
transporter.verify(function(error, success) {
  if (error) {
    console.error("Nodemailer configuration error:", error);
  } else {
    console.log("Nodemailer is ready to take messages");
  }
});

module.exports = transporter;