import mongoose from 'mongoose';

const hearingSchema = new mongoose.Schema(
  {
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case', required: true, index: true },
    scheduledAt: { type: Date, required: true, index: true },
    court: { type: String, trim: true, maxlength: 160 },
    hearingType: { type: String, trim: true, maxlength: 80 },
    notes: { type: String, trim: true, maxlength: 2000 },
    outcome: { type: String, trim: true, maxlength: 2000 },
    nextAction: { type: String, trim: true, maxlength: 500 },
    nextHearingAt: { type: Date },
    cancelledAt: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

hearingSchema.index({ teamId: 1, scheduledAt: 1 });
hearingSchema.index({ caseId: 1, scheduledAt: -1 });

export const Hearing = mongoose.model('Hearing', hearingSchema);
