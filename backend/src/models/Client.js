import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema(
  {
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 160 },
    phone: { type: String, trim: true, maxlength: 40 },
    email: { type: String, trim: true, lowercase: true, maxlength: 160 },
    notes: { type: String, trim: true, maxlength: 2000 },
    assignedLawyerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    nextFollowUpAt: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    archivedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

clientSchema.index({ teamId: 1, name: 1 });
clientSchema.index({ teamId: 1, archivedAt: 1, assignedLawyerId: 1 });

export const Client = mongoose.model('Client', clientSchema);
