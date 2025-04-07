const express = require('express');
const controller = require('../controllers/user.controller');
const { verifyToken, isAdmin } = require('../middleware/authJwt');
const router = express.Router();

router.use(verifyToken, isAdmin); 

router.post('/', controller.createUser);
router.get('/', controller.getAllUsers);
router.put('/:userId', controller.updateUserDetails);     
router.put('/:userId/role', controller.updateUserRole);  
router.delete('/:userId', controller.deleteUser);   

module.exports = router;