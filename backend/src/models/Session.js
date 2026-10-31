import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    refreshTokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true, index: true },
    revokedAt: { type: Date },
    replacedByHash: { type: String },
    userAgent: { type: String, maxlength: 400 },
    ip: { type: String, maxlength: 80 },
  },
  { timestamps: true },
);

sessionSchema.index({ userId: 1, revokedAt: 1 });

export const Session = mongoose.model('Session', sessionSchema);
