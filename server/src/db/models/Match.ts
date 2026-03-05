import mongoose, { Schema, Document } from 'mongoose';

export interface IMatch extends Document {
  lobbyId: string;
  players: {
    playerId: string;
    name: string;
    placement: number;
    survivalTime: number;
  }[];
  winnerId?: string;
  winnerName?: string;
  duration: number;
  createdAt: Date;
}

const MatchSchema = new Schema<IMatch>(
  {
    lobbyId: { type: String, required: true },
    players: [
      {
        playerId: String,
        name: String,
        placement: Number,
        survivalTime: Number,
      },
    ],
    winnerId: String,
    winnerName: String,
    duration: { type: Number, required: true },
  },
  { timestamps: true },
);

export const Match = mongoose.model<IMatch>('Match', MatchSchema);
