import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['admin', 'lawyer'], required: true, default: 'lawyer' },
    isActive: { type: Boolean, default: true },
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    timezone: { type: String, default: 'UTC' },
    onboardingComplete: { type: Boolean, default: false },
    passwordChangedAt: { type: Date },
  },
  { timestamps: true },
);

userSchema.index({ teamId: 1, isActive: 1 });

userSchema.set('toJSON', {
  transform(_doc, ret) {
    delete ret.passwordHash;
    return ret;
  },
});

export const User = mongoose.model('User', userSchema);
