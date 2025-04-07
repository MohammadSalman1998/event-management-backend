const QRCode = require('qrcode');

const generateQRCode = async (text) => {
  try {
    // Generate QR code as a Base64 data URL
    const qrCodeDataURL = await QRCode.toDataURL(text);
    return qrCodeDataURL;
  } catch (err) {
    console.error('Error generating QR code:', err);
    throw err; // Re-throw the error
  }
};

module.exports = { generateQRCode };