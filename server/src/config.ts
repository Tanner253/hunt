import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  mongoUri: process.env.MONGODB_URI || '',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
};
