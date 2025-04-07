const User = require('../models/user.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Signup - Consider restricting this or making it an initial setup script
exports.signup = async (req, res, next) => {
  try {
    // Basic validation
    if (!req.body.email || !req.body.password) {
      return res.status(400).send({ message: 'Email and password are required.' });
    }

    const newUser = {
        email: req.body.email,
        password: req.body.password,
        name: req.body.name || null
    };

    // Check if user already exists
    const existingUser = await User.findByEmail(newUser.email);
    if (existingUser) {
        return res.status(400).send({ message: 'Failed! Email is already in use!' });
    }

    const user = await User.create(newUser);
    res.status(201).send({ message: 'User was registered successfully!', newUser });
  } catch (error) {
    next(error); // Pass error to the error handler
  }
};

exports.signin = async (req, res, next) => {
  try {
      if (!req.body.email || !req.body.password) {
          return res.status(400).send({ message: 'يجب إدخال الإيميل وكلمة المرور' });
      }
    const user = await User.findByEmail(req.body.email);

    if (!user) {
      return res.status(404).send({ message: 'الإيميل أو كلمة المرور غير صحيحة' });
    }

    const passwordIsValid = bcrypt.compareSync(
      req.body.password,
      user.password
    ); 

    if (!passwordIsValid) {
      return res.status(401).send({
        accessToken: null,
        message: 'الإيميل أو كلمة المرور غير صحيحة',
      });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role }, // **** إضافة role هنا ****
      process.env.JWT_SECRET,
      { expiresIn: parseInt(process.env.JWT_EXPIRATION || "86400", 10) }
    );
    
    res.status(200).send({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role, // **** إضافة role هنا ****
      accessToken: token,
    });

  } catch (error) {
    next(error);
  }
};