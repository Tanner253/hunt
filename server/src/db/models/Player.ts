import mongoose, { Schema, Document } from 'mongoose';

export interface IPlayer extends Document {
  visitorId: string;
  name: string;
  wallet?: string;
  wins: number;
  losses: number;
  gamesPlayed: number;
  totalSurvivalTime: number;
  createdAt: Date;
  updatedAt: Date;
}

const PlayerSchema = new Schema<IPlayer>(
  {
    visitorId: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    wallet: { type: String },
    wins: { type: Number, default: 0 },
    losses: { type: Number, default: 0 },
    gamesPlayed: { type: Number, default: 0 },
    totalSurvivalTime: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const Player = mongoose.model<IPlayer>('Player', PlayerSchema);
