// backend/src/models/User.js
// Example User model (e.g., for Mongoose if using MongoDB)
// This is a placeholder. Implement if you add user authentication and data persistence.
/*
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    // Add email validation if desired
  },
  passwordHash: { // Store hashed password, not plain text
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  // Add other fields like 'name', 'profilePictureUrl', etc.
});

// Add methods for password hashing and comparison if not handled elsewhere
// UserSchema.pre('save', async function(next) { ... hash password ... });
// UserSchema.methods.comparePassword = async function(candidatePassword) { ... };

module.exports = mongoose.model('User', UserSchema);
*/
