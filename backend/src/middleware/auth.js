// backend/src/middleware/auth.js
// Example authentication middleware (e.g., JWT verification)
// This is a placeholder. Implement if you add user authentication.
/*
const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  // Get token from header (e.g., 'Authorization': 'Bearer TOKEN')
  const authHeader = req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ msg: 'No token or malformed token, authorization denied' });
  }

  const token = authHeader.split(' ')[1];

  // Check if not token
  if (!token) {
    return res.status(401).json({ msg: 'No token, authorization denied' });
  }

  // Verify token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user; // Add user payload to request object
    next();
  } catch (err) {
    console.error('JWT Error:', err.message);
    res.status(401).json({ msg: 'Token is not valid' });
  }
};
*/
