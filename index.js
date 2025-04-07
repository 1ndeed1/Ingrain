const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const authMiddleware = require('./middleware/auth');
const { Server } = require('socket.io');
const http = require('http');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// MongoDB Connection (removed deprecated options)
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/ingrain')
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    fallthrough: true
}));
app.get('/uploads/default.jpg', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'default-placeholder.jpg'));
});
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
    credentials: true
}));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/farmer', require('./routes/farmer'));
app.use('/api/consumer', require('./routes/consumer'));
app.use('/api/messages', require('./routes/messages'));

// Serve Frontend Routes
app.get('/farmer', authMiddleware, (req, res) => {
    if (req.user.role !== 'farmer') return res.redirect('/login');
    res.sendFile(path.join(__dirname, 'public/farmer/farmer.html'));
});

app.get('/consumer', authMiddleware, (req, res) => {
    if (req.user.role !== 'consumer') return res.redirect('/login');
    res.sendFile(path.join(__dirname, 'public/consumer/consumer.html'));
});

app.get('/farmer/profile', authMiddleware, (req, res) => {
    if (req.user.role !== 'farmer') return res.redirect('/login');
    res.sendFile(path.join(__dirname, 'public/farmer/profile/profile.html'));
});

app.get('/consumer/profile', authMiddleware, (req, res) => {
    if (req.user.role !== 'consumer') return res.redirect('/login');
    res.sendFile(path.join(__dirname, 'public/consumer/profile/profile.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/login/login.html'));
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/home/home.html'));
});

// Error Handling Middleware
app.use((err, req, res, next) => {
    console.error('🚨 Server error:', err.stack);
    res.status(err.status || 500).json({ 
        error: process.env.NODE_ENV === 'development' ? err.message : 'Internal error' 
    });
});

// Socket.IO Authentication Middleware
io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.headers['authorization']?.split(' ')[1];
    if (!token) return next(new Error('Authentication error'));

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.userId;
        socket.role = decoded.role;
        next();
    } catch (err) {
        return next(new Error('Invalid token'));
    }
});

// Socket.IO Setup
io.on('connection', (socket) => {
    console.log(`Socket.IO client connected: User ${socket.userId} (${socket.role})`);

    socket.on('sendMessage', async (data) => {
        const { receiverId, content, productId, orderId } = data;
        try {
            const Message = require('./models/Message');
            const message = new Message({
                senderId: socket.userId,
                receiverId,
                content,
                productId: productId || null,
                orderId: orderId || null
            });
            await message.save();

            const populatedMessage = await Message.findById(message._id)
                .populate('senderId', 'profile.name email')
                .populate('receiverId', 'profile.name email')
                .populate('productId', 'name')
                .populate('orderId', 'items');

            io.to(socket.userId).emit('newMessage', populatedMessage);
            io.to(receiverId).emit('newMessage', populatedMessage);
        } catch (err) {
            console.error('Socket.IO message error:', err);
        }
    });

    socket.on('disconnect', () => {
        console.log(`User ${socket.userId} disconnected from Socket.IO`);
    });

    socket.join(socket.userId);
});

// Start Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode`);
    console.log(`👉 Access at http://localhost:${PORT}`);
});