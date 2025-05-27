// backend/src/middleware/errorHandler.js
function errorHandler(err, req, res, next) {
  console.error("Global Error Handler Caught:");
  console.error("Message:", err.message);
  console.error("Stack:", err.stack);
  // If the error is a known type or has a status code, use it
  const statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 500) ;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message,
    // Optionally include stack in development for easier debugging
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

module.exports = errorHandler;
