const errorHandler = (err, req, res, next) => {
    console.error("ERROR:", err.stack || err);
  
    // Default error response
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
  
    // Customize error response based on error type if needed
    // if (err.name === 'ValidationError') ...
  
    res.status(statusCode).json({
      status: 'error',
      statusCode,
      message,
      // Optionally include stack trace in development
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  };
  
  module.exports = errorHandler;