const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const cors = require('cors');
const { NlpManager } = require('node-nlp');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());  // for parsing application/json

const nlpManager = new NlpManager({ languages: ['en'] });

// Train the NLP model (this should be done once and saved, but for simplicity we'll do it here)
nlpManager.addDocument('en', 'Tell me about yourself', 'introduction');
nlpManager.addDocument('en', 'What can you tell me about you', 'introduction');
nlpManager.addDocument('en', 'Who are you', 'introduction');
nlpManager.addAnswer('en', 'introduction', 'I am an AI assistant designed to help with interviews and conversations.');

nlpManager.addDocument('en', 'What are your strengths', 'strengths');
nlpManager.addDocument('en', 'What do you excel at', 'strengths');
nlpManager.addDocument('en', 'What are you good at', 'strengths');
nlpManager.addAnswer('en', 'strengths', 'My strengths include quick information processing, unbiased responses, and the ability to handle multiple topics.');

nlpManager.addDocument('en', 'Where do you see yourself in 5 years', 'future_plans');
nlpManager.addDocument('en', 'What are your future goals', 'future_plans');
nlpManager.addDocument('en', 'What do you want to achieve in the future', 'future_plans');
nlpManager.addAnswer('en', 'future_plans', 'As an AI, my goal is to continuously improve and provide better assistance to users like you.');

nlpManager.addDocument('en', 'How do you handle stress', 'stress_management');
nlpManager.addDocument('en', 'What\'s your approach to dealing with pressure', 'stress_management');
nlpManager.addAnswer('en', 'stress_management', 'I don\'t experience stress, but I can process complex queries efficiently without compromising performance.');

nlpManager.train();

const port = process.env.PORT || 3001;
const secureServerUrl = process.env.REACT_APP_SECURE_SERVER_URL || `wss://pally-bot-ai-server.herokuapp.com`;

const server = http.createServer(app);
const io = socketIo(server, {
  path: '/socket.io',
  transports: ['websocket', 'polling'],
  cors: {
    origin: process.env.CLIENT_URL || ['http://localhost:3000', 'https://localhost:3000', secureServerUrl],
    methods: ['GET', 'POST'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  allowEIO3: true,
  cookie: {
    name: 'io',
    path: '/',
    httpOnly: true,
    sameSite: 'strict'
  },
  secure: process.env.NODE_ENV === 'production'
});

// Log server initialization
console.log(`Server initialized. Listening for HTTP on port ${port} and WebSocket on ${secureServerUrl}`);





// Error handling for WebSocket server
io.engine.on('connection_error', (err) => {
  console.error('WebSocket connection error:', err);
});

// WebRTC signaling
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('offer', (offer, targetSocketId) => {
    console.log(`Offer received from ${socket.id} to ${targetSocketId}`);
    socket.to(targetSocketId).emit('offer', offer, socket.id);
  });

  socket.on('answer', (answer, targetSocketId) => {
    console.log(`Answer received from ${socket.id} to ${targetSocketId}`);
    socket.to(targetSocketId).emit('answer', answer, socket.id);
  });

  socket.on('ice-candidate', (candidate, targetSocketId) => {
    console.log(`ICE candidate received from ${socket.id} to ${targetSocketId}`);
    socket.to(targetSocketId).emit('ice-candidate', candidate, socket.id);
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });

  socket.on('disconnect', (reason) => {
    console.log(`A user disconnected (${socket.id}). Reason: ${reason}`);
  });
});

const serverUrl = process.env.REACT_APP_SECURE_SERVER_URL || `wss://localhost:${port}`;
server.listen(port, () => {
  console.log(`HTTP server running on port ${port}`);
  console.log(`WebSocket server URL: ${serverUrl}`);
  console.log(`Server environment: ${process.env.NODE_ENV || 'development'}`);
});

// NLP processing route
app.post('/api/process-input', async (req, res) => {
  const { input, context } = req.body;
  try {
    const result = await nlpManager.process('en', input, context);

    // Enhanced response generation
    let responseText = result.answer || "I'm not sure how to respond to that.";
    if (result.intent) {
      switch (result.intent) {
        case 'introduction':
          responseText = `Nice to meet you! I'm an AI assistant designed to help with interviews. ${responseText}`;
          break;
        case 'strengths':
          responseText = `That's a great question about strengths. ${responseText}`;
          break;
        case 'future_plans':
          responseText = `Thinking about the future is important. ${responseText}`;
          break;
        case 'stress_management':
          responseText = `Handling stress is crucial in any job. ${responseText}`;
          break;
        default:
          responseText = `I understand you're asking about ${result.intent}. ${responseText}`;
      }
    }

    // More sophisticated emotion detection
    let emotion = 'neutral';
    if (result.sentiment) {
      const score = result.sentiment.score;
      if (score > 0.7) emotion = 'very_happy';
      else if (score > 0.3) emotion = 'happy';
      else if (score < -0.7) emotion = 'very_sad';
      else if (score < -0.3) emotion = 'sad';
      else if (score > 0.1) emotion = 'slightly_positive';
      else if (score < -0.1) emotion = 'slightly_negative';
    }

    // Enhanced context handling
    const updatedContext = {
      ...context,
      intent: result.intent,
      entities: result.entities,
      previousEmotion: emotion
    };

    const response = {
      text: responseText,
      emotion: emotion,
      context: updatedContext,
      confidence: result.score
    };

    res.json(response);
  } catch (error) {
    console.error('Error processing input:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Question generation route
app.get('/api/generate-questions', async (req, res) => {
  try {
    const questionTopics = ['introduction', 'strengths', 'future_plans'];
    const questions = await Promise.all(
      questionTopics.map(topic => nlpManager.generateQuestion('en', topic))
    );

    // Filter out any undefined or null questions
    const validQuestions = questions.filter(q => q != null);

    if (validQuestions.length === 0) {
      throw new Error('No valid questions generated');
    }

    res.json({ questions: validQuestions });
  } catch (error) {
    console.error('Error generating questions:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to generate questions',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// SQLite database initialization
const db = new sqlite3.Database('./users.db');

// Create users table if not exists
db.run(`CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  password TEXT
)`);

// User registration route
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], (err) => {
      if (err) {
        return res.status(400).json({ error: 'Username already exists' });
      }
      res.status(201).json({ message: 'User registered successfully' });
    });
  } catch (error) {
    res.status(500).json({ error: 'Error registering user' });
  }
});

// User login route
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err || !user) {
      return res.status(400).json({ error: 'Invalid username or password' });
    }
    try {
      if (await bcrypt.compare(password, user.password)) {
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ token });
      } else {
        res.status(400).json({ error: 'Invalid username or password' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Error logging in' });
    }
  });
});
