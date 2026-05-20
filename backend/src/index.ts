import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import http from 'http';
import { Server } from 'socket.io';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
export const prisma = new PrismaClient();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Importing placeholder routes
import authRoutes from './routes/auth.routes';
import listingsRoutes from './routes/listings.routes';
import reviewsRoutes from './routes/reviews.routes';

// Routing
app.use('/api/auth', authRoutes);
app.use('/api/listings', listingsRoutes);
app.use('/api/reviews', reviewsRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Backend is running' });
});

// Real-time Availability & WebSockets
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
