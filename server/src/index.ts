import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import { config } from './config';
import { connectDB } from './db/connection';
import { LobbyManager } from './game/LobbyManager';
import { registerSocketHandlers } from './socket/handlers';

async function main() {
  const app = express();
  const server = http.createServer(app);

  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json());

  app.get('/health', (_, res) => res.json({ status: 'ok', uptime: process.uptime() }));

  if (config.mongoUri) {
    await connectDB(config.mongoUri);
  } else {
    console.warn('MONGODB_URI not set — running without database');
  }

  const io = new Server(server, {
    cors: { origin: config.corsOrigin, methods: ['GET', 'POST'] },
    transports: ['websocket', 'polling'],
  });

  const lobbyManager = new LobbyManager();
  registerSocketHandlers(io, lobbyManager);

  server.listen(config.port, () => {
    console.log(`Hunt server running on port ${config.port}`);
    console.log(`CORS origin: ${config.corsOrigin}`);
  });
}

main().catch(console.error);
