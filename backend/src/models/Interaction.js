import mongoose from 'mongoose';

export const INTERACTION_TYPES = ['call', 'meeting', 'email', 'follow_up', 'other'];

const interactionSchema = new mongoose.Schema(
  {
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true, index: true },
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case' },
    type: { type: String, enum: INTERACTION_TYPES, required: true },
    occurredAt: { type: Date, required: true },
    summary: { type: String, required: true, trim: true, maxlength: 2000 },
    followUpRequired: { type: Boolean, default: false },
    followUpAt: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

interactionSchema.index({ teamId: 1, clientId: 1, occurredAt: -1 });

export const Interaction = mongoose.model('Interaction', interactionSchema);
