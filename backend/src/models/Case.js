import mongoose from 'mongoose';

export const CASE_STATUSES = ['active', 'pending', 'on_hold', 'closed', 'archived'];
export const CASE_PRIORITIES = ['low', 'normal', 'high', 'urgent'];

const caseSchema = new mongoose.Schema(
  {
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    internalId: { type: String, required: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    caseNumber: { type: String, trim: true, maxlength: 80 },
    caseType: { type: String, trim: true, maxlength: 80 },
    court: { type: String, trim: true, maxlength: 160 },
    jurisdiction: { type: String, trim: true, maxlength: 120 },
    clientIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Client' }],
    opposingParty: { type: String, trim: true, maxlength: 160 },
    assignedLawyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    authorizedUserIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    status: { type: String, enum: CASE_STATUSES, default: 'pending', index: true },
    priority: { type: String, enum: CASE_PRIORITIES, default: 'normal' },
    filingDate: { type: Date },
    nextHearingAt: { type: Date },
    internalNotes: { type: String, trim: true, maxlength: 5000 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: '__v' },
);

caseSchema.index({ teamId: 1, internalId: 1 }, { unique: true });
caseSchema.index({ teamId: 1, status: 1, nextHearingAt: 1 });
caseSchema.index({ teamId: 1, authorizedUserIds: 1 });
caseSchema.index({ teamId: 1, assignedLawyerId: 1, archivedAt: 1 });

export const Case = mongoose.model('Case', caseSchema);
