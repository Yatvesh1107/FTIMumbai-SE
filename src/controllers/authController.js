const User = require('../models/User');
const Student = require('../models/Student');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'fti_secret_key', {
    expiresIn: '30d',
  });
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    user.lastLogin = new Date();
    await user.save();

    // If student, check app lock status
    let studentDetails = null;
    if (user.role === 'student' && user.studentId) {
      studentDetails = await Student.findById(user.studentId);
    }

    res.json({
      success: true,
      token: generateToken(user._id),
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        studentId: user.studentId,
        studentStatus: studentDetails ? studentDetails.status : 'active',
        lockReason: studentDetails ? studentDetails.lockReason : ''
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login', error: error.message });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    let studentDetails = null;
    if (user.role === 'student' && user.studentId) {
      studentDetails = await Student.findById(user.studentId);
    }

    res.json({
      success: true,
      user: {
        ...user.toObject(),
        studentStatus: studentDetails ? studentDetails.status : 'active',
        lockReason: studentDetails ? studentDetails.lockReason : ''
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching profile' });
  }
};

// @desc    Register a new user (Admin only)
// @route   POST /api/auth/register
// @access  Private (Admin)
exports.registerUser = async (req, res) => {
  try {
    const { name, email, password, role, mobile, studentId } = req.body;

    const userExists = await User.findOne({ email: email.toLowerCase().trim() });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    const user = await User.create({
      name,
      email: email.toLowerCase().trim(),
      password,
      role: role || 'student',
      mobile,
      studentId: studentId || null
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    List all system staff & users
// @route   GET /api/auth/users
// @access  Private (Admin)
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
