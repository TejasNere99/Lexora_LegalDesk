import mongoose from 'mongoose';

const hearingHistorySchema = new mongoose.Schema(
  {
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    hearingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hearing', required: true, index: true },
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', required: true },
    previousScheduledAt: { type: Date },
    nextScheduledAt: { type: Date },
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, trim: true, maxlength: 400 },
  },
  { timestamps: true },
);

export const HearingHistory = mongoose.model('HearingHistory', hearingHistorySchema);
