// server.js
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nepali_voting', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// File Upload Configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/documents/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images (JPEG, JPG, PNG) and PDF files are allowed'));
    }
  }
});

// Models
const User = require('./models/User');
const Candidate = require('./models/Candidate');
const Vote = require('./models/Vote');
const Review = require('./models/Review');

// AI Content Filter
const aiContentFilter = (text) => {
  const inappropriateWords = [
    'spam', 'hate', 'violence', 'scam', 'fake', 'abusive', 'fraud', 'corrupt', 
    'bribe', 'illegal', 'terrorist', 'bomb', 'kill', 'murder', 'death', 
    'stupid', 'idiot', 'fool', 'worthless', 'useless', 'garbage'
  ];
  
  const positiveWords = ['good', 'excellent', 'great', 'amazing', 'wonderful', 'fantastic'];
  const lowercaseText = text.toLowerCase();
  
  const inappropriateCount = inappropriateWords.filter(word => 
    lowercaseText.includes(word)
  ).length;
  
  const positiveCount = positiveWords.filter(word => 
    lowercaseText.includes(word)
  ).length;
  
  if (text.length < 10) {
    return {
      approved: false,
      reason: 'Review too short - minimum 10 characters required',
      confidence: 100
    };
  }
  
  if (text.length > 500) {
    return {
      approved: false,
      reason: 'Review too long - maximum 500 characters allowed',
      confidence: 100
    };
  }
  
  if (inappropriateCount > 2) {
    return {
      approved: false,
      reason: 'Inappropriate language or spam content detected',
      confidence: 95
    };
  }
  
  if (inappropriateCount > 0 && positiveCount === 0) {
    return {
      approved: false,
      reason: 'Potentially inappropriate content detected',
      confidence: 75
    };
  }
  
  const words = text.split(' ');
  const uniqueWords = new Set(words);
  if (words.length > 5 && uniqueWords.size / words.length < 0.5) {
    return {
      approved: false,
      reason: 'Repetitive content appears to be spam',
      confidence: 80
    };
  }
  
  return { 
    approved: true, 
    confidence: 90,
    sentiment: positiveCount > inappropriateCount ? 'positive' : 'neutral'
  };
};

// Auth Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret', (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// Routes

// Authentication Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, country, documentType, documentId, password } = req.body;
    
    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [
        { email: email },
        { documentId: documentId }
      ]
    });
    
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'User with this email or document already exists' 
      });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Create user
    const user = new User({
      name,
      email,
      country,
      documentType,
      documentId,
      password: hashedPassword,
      documentVerified: false,
      hasVoted: false
    });
    
    await user.save();
    
    res.status(201).json({ 
      success: true, 
      message: 'User registered successfully',
      user: {
        id: user._id,
        name: user.name,
        country: user.country,
        documentVerified: user.documentVerified
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Registration failed', 
      error: error.message 
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { name, country, documentType, documentId } = req.body;
    
    // Find or create user
    let user = await User.findOne({ documentId: documentId });
    
    if (!user) {
      user = new User({
        name,
        country,
        documentType,
        documentId,
        documentVerified: false,
        hasVoted: false
      });
      await user.save();
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, name: user.name },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '24h' }
    );
    
    res.json({ 
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        country: user.country,
        documentType: user.documentType,
        documentId: user.documentId,
        documentVerified: user.documentVerified,
        hasVoted: user.hasVoted
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Login failed', 
      error: error.message 
    });
  }
});

// Document Verification
app.post('/api/auth/verify-document', upload.single('document'), async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No document file uploaded' 
      });
    }
    
    // Simulate document verification process
    // In real implementation, this would integrate with document verification services
    setTimeout(async () => {
      try {
        await User.findByIdAndUpdate(userId, { 
          documentVerified: true,
          documentPath: req.file.path
        });
        
        res.json({ 
          success: true, 
          message: 'Document verified successfully' 
        });
      } catch (error) {
        res.status(500).json({ 
          success: false, 
          message: 'Verification failed', 
          error: error.message 
        });
      }
    }, 2000);
    
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Document verification failed', 
      error: error.message 
    });
  }
});

// Candidate Routes
app.get('/api/candidates', async (req, res) => {
  try {
    const candidates = await Candidate.find({ active: true });
    res.json(candidates);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch candidates', 
      error: error.message 
    });
  }
});

app.post('/api/candidates', async (req, res) => {
  try {
    const { name, party } = req.body;
    
    const candidate = new Candidate({
      name,
      party,
      active: true
    });
    
    await candidate.save();
    
    res.status(201).json({ 
      success: true, 
      message: 'Candidate added successfully',
      candidate 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to add candidate', 
      error: error.message 
    });
  }
});

app.delete('/api/candidates/:id', async (req, res) => {
  try {
    await Candidate.findByIdAndUpdate(req.params.id, { active: false });
    res.json({ 
      success: true, 
      message: 'Candidate removed successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to remove candidate', 
      error: error.message 
    });
  }
});

// Voting Routes
app.post('/api/vote', async (req, res) => {
  try {
    const { userId, candidateId } = req.body;
    
    // Check if user exists and is verified
    const user = await User.findById(userId);
    if (!user || !user.documentVerified) {
      return res.status(400).json({ 
        success: false, 
        message: 'User not verified or does not exist' 
      });
    }
    
    // Check if user has already voted
    if (user.hasVoted) {
      return res.status(400).json({ 
        success: false, 
        message: 'User has already voted' 
      });
    }
    
    // Check if candidate exists
    const candidate = await Candidate.findById(candidateId);
    if (!candidate || !candidate.active) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid candidate' 
      });
    }
    
    // Create vote record
    const vote = new Vote({
      userId,
      candidateId,
      userCountry: user.country,
      timestamp: new Date(),
      ipAddress: req.ip
    });
    
    await vote.save();
    
    // Mark user as voted
    await User.findByIdAndUpdate(userId, { hasVoted: true });
    
    res.json({ 
      success: true, 
      message: 'Vote recorded successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Voting failed', 
      error: error.message 
    });
  }
});

app.get('/api/votes', async (req, res) => {
  try {
    const voteCounts = await Vote.aggregate([
      { $group: { _id: '$candidateId', count: { $sum: 1 } } }
    ]);
    
    const voteResults = {};
    voteCounts.forEach(vote => {
      voteResults[vote._id] = vote.count;
    });
    
    res.json(voteResults);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch votes', 
      error: error.message 
    });
  }
});

app.get('/api/voter-stats', async (req, res) => {
  try {
    const countryStats = await Vote.aggregate([
      { $group: { _id: '$userCountry', count: { $sum: 1 } } }
    ]);
    
    const stats = {};
    countryStats.forEach(stat => {
      stats[stat._id] = stat.count;
    });
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch voter stats', 
      error: error.message 
    });
  }
});

// Review Routes
app.post('/api/reviews', async (req, res) => {
  try {
    const { userId, candidateId, rating, content } = req.body;
    
    // Get user info
    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // AI content filtering
    const filterResult = aiContentFilter(content);
    
    const review = new Review({
      userId,
      candidateId,
      rating,
      content,
      userCountry: user.country,
      userName: user.name,
      aiApproved: filterResult.approved,
      aiReason: filterResult.reason || 'Content is appropriate',
      aiConfidence: filterResult.confidence || 90,
      sentiment: filterResult.sentiment || 'neutral',
      status: filterResult.approved ? 'approved' : 'pending',
      timestamp: new Date()
    });
    
    await review.save();
    
    const message = filterResult.approved 
      ? 'Review submitted successfully' 
      : `Review filtered by AI: ${filterResult.reason}`;
    
    res.json({ 
      success: true, 
      message,
      aiFiltered: !filterResult.approved
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Review submission failed', 
      error: error.message 
    });
  }
});

app.get('/api/reviews', async (req, res) => {
  try {
    const reviews = await Review.find().populate('candidateId', 'name party');
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch reviews', 
      error: error.message 
    });
  }
});

app.put('/api/reviews/:id/approve', async (req, res) => {
  try {
    await Review.findByIdAndUpdate(req.params.id, { status: 'approved' });
    res.json({ 
      success: true, 
      message: 'Review approved successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to approve review', 
      error: error.message 
    });
  }
});

app.delete('/api/reviews/:id', async (req, res) => {
  try {
    await Review.findByIdAndDelete(req.params.id);
    res.json({ 
      success: true, 
      message: 'Review deleted successfully' 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete review', 
      error: error.message 
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Nepali Voting API is running',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ 
    success: false, 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Nepali Voting API server running on port ${PORT}`);
});

// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, sparse: true },
  country: { type: String, required: true },
  documentType: { type: String, required: true },
  documentId: { type: String, required: true, unique: true },
  documentPath: { type: String },
  password: { type: String },
  documentVerified: { type: Boolean, default: false
