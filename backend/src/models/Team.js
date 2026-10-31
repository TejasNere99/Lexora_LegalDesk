import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    settings: {
      timezone: { type: String, default: 'UTC' },
      retentionDays: { type: Number, default: 2555 },
    },
  },
  { timestamps: true },
);

export const Team = mongoose.model('Team', teamSchema);
