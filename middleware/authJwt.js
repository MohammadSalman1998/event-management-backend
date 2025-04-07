const jwt = require("jsonwebtoken");
require("dotenv").config();
const User = require("../models/user.model"); // If needed to check user status

const verifyToken = (req, res, next) => {
  let token = req.headers["authorization"]; // Commonly 'Authorization: Bearer TOKEN'

  if (!token) {
    return res.status(403).send({ message: "No token provided!" });
  }

  // Extract token if it's in 'Bearer TOKEN' format
  if (token.startsWith("Bearer ")) {
    token = token.slice(7, token.length);
  }
  

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error("JWT Verification Error:", err);
      // Differentiate between expired and invalid token
      if (err.name === "TokenExpiredError") {
        return res
          .status(401)
          .send({ message: "Unauthorized! Token was expired!" });
      }
      return res.status(401).send({ message: "Unauthorized! Invalid Token!" });
    }
    req.userId = decoded.id; // Add user ID to the request object
    req.userRole = decoded.role;
    // Optional: Check if user still exists or is active in DB
    // User.findById(req.userId).then(user => { if (!user) return res.status(401)... })
    next();
  });
};


const isAdmin = (req, res, next) => {
  if (req.userRole && req.userRole === 'ADMIN') {
      next(); 
      return;
  }
  res.status(403).send({ message: "Require Admin Role!" }); // ممنوع الوصول
};

const isScanner = (req, res, next) => {
  if (req.userRole && req.userRole === 'SCANNER') {
      next();
      return;
  }
  res.status(403).send({ message: "Require Scanner Role!" });
};

const isAdminOrScanner = (req, res, next) => {
   if (req.userRole && (req.userRole === 'ADMIN' || req.userRole === 'SCANNER')) {
      next();
      return;
  }
  res.status(403).send({ message: "Require Admin or Scanner Role!" });
}

module.exports = { verifyToken, isAdmin, isScanner, isAdminOrScanner };



