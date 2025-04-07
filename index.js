const express = require('express');
const cors = require('cors');
require('dotenv').config(); // Load environment variables early

const apiRoutes = require('./routes/index'); // Import combined routes
const errorHandler = require('./middleware/errorHandler'); // Import error handler

const app = express();

// CORS Configuration - Adjust origin for production
const corsOptions = {
  origin: process.env.FRONTEND_URL || "https://event-management-frontend-332gbjdk5.vercel.app" 
  // origin: "*" // Allow frontend origin
};
app.use(cors(corsOptions));

// Parse requests of content-type - application/json
app.use(express.json());

// Parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

// Simple route for testing
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Event Management API.' });
});
 
// API Routes
app.use('/api', apiRoutes); // Mount all API routes under /api

// Centralized Error Handler - Should be last middleware
app.use(errorHandler);

// Set port, listen for requests
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
  // Optional: Verify DB connection on startup
  const pool = require('./config/db.config.js');
  pool.getConnection()
    .then(connection => {
        console.log("Successfully connected to the database.");
        connection.release();
    })
    .catch(err => {
        console.error("Database connection failed:", err);
        // Optionally exit the process if DB connection is critical
        // process.exit(1);
    });
});