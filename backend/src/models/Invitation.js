import mongoose from 'mongoose';

const invitationSchema = new mongoose.Schema(
  {
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    role: { type: String, enum: ['admin', 'lawyer'], default: 'lawyer' },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    acceptedAt: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

invitationSchema.index({ teamId: 1, email: 1, acceptedAt: 1 });

export const Invitation = mongoose.model('Invitation', invitationSchema);
