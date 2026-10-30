const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');
require('dotenv').config();

const logger = require('./utils/logger');
const { errorHandler, notFound } = require('./middleware/errorMiddleware');
const { startCronJobs } = require('./utils/cronJobs');

// Route imports
const authRoutes = require('./routes/auth');
const institutionRoutes = require('./routes/institutions');
const complaintRoutes = require('./routes/complaints');
const dashboardRoutes = require('./routes/dashboard');
const reportRoutes = require('./routes/reports');
const userRoutes = require('./routes/users');
const bureauRoutes = require('./routes/bureaus');
const notificationRoutes = require('./routes/notifications');
const overlapRoutes = require('./routes/overlaps');

const app = express();
const httpServer = createServer(app);

// CORS configuration supporting local dev and Render deployments
const corsOriginCheck = (origin, callback) => {
  if (!origin) return callback(null, true);
  const clientUrl = process.env.CLIENT_URL;
  if (
    origin === clientUrl ||
    origin === 'http://localhost:3000' ||
    origin === 'http://127.0.0.1:3000' ||
    /\.onrender\.com$/.test(new URL(origin).hostname)
  ) {
    return callback(null, true);
  }
  return callback(null, true);
};

// Socket.IO setup
const io = new Server(httpServer, {
  cors: {
    origin: corsOriginCheck,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Make io accessible to routes
app.set('io', io);

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

// Security middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(mongoSanitize());
app.use('/api', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// CORS
app.use(
  cors({
    origin: corsOriginCheck,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Static file serving (uploads)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'AICMS API is running', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/institutions', institutionRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/bureaus', bureauRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/overlaps', overlapRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Socket.IO events
io.on('connection', (socket) => {
  logger.info(`Socket connected: ${socket.id}`);

  socket.on('join_bureau', (bureauId) => {
    socket.join(`bureau_${bureauId}`);
  });

  socket.on('join_admin', () => {
    socket.join('admin_room');
  });

  socket.on('disconnect', () => {
    logger.info(`Socket disconnected: ${socket.id}`);
  });
});

// MongoDB connection
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    logger.error(`MongoDB connection error: ${err.message}`);
    process.exit(1);
  }
};

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  httpServer.listen(PORT, () => {
    logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    // Start scheduled jobs after DB is connected
    startCronJobs(io);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Rejection: ${err.message}`);
  httpServer.close(() => process.exit(1));
});

module.exports = { app, io };

