import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';

const signToken = (userId, role) =>
  jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

function dbCheck(res) {
  if (mongoose.connection.readyState !== 1) {
    res.status(503).json({
      error: 'Database not connected.',
      message: 'Please set MONGO_URI in backend/.env and restart the server.'
    });
    return false;
  }
  return true;
}


/* POST /api/auth/register */
export const register = async (req, res) => {
  if (!dbCheck(res)) return;
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    const user = await User.create({ name, email, password });
    const token = signToken(user._id.toString(), user.role);

    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ error: 'Registration failed.', message: err.message });
  }
};


/* POST /api/auth/login */
export const login = async (req, res) => {
  if (!dbCheck(res)) return;
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = signToken(user._id.toString(), user.role);

    res.json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed.', message: err.message });
  }
};
