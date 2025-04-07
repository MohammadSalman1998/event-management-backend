const express = require('express');
const controller = require('../controllers/checkin.controller');
const { verifyToken, isAdminOrScanner } = require('../middleware/authJwt');
const router = express.Router();


router.post('/', verifyToken, isAdminOrScanner, controller.markAttendance); 

module.exports = router;