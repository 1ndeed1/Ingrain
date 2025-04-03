// index.js
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const authMiddleware = require('./middleware/auth');
require('dotenv').config();

const app = express();

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/ingrain')
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/farmer', require('./routes/farmer'));
app.use('/api/consumer', require('./routes/consumer'));

// Frontend Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/home/home.html'));
});

app.get('/farmer', authMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, 'public/farmer/farmer.html'));
});

app.get('/farmer/profile', authMiddleware, (req, res) => {
    res.sendFile(path.join(__dirname, 'public/farmer/profile/profile.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/login/login.html'));
});

// Error Handling
app.use((err, req, res, next) => {
    console.error('🚨 Server error:', err.stack);
    res.status(err.status || 500).json({ 
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal error' 
    });
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode`);
    console.log(`👉 Access at http://localhost:${PORT}`);
});