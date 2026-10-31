import mongoose from 'mongoose';

export const TASK_STATUSES = ['todo', 'in_progress', 'completed', 'cancelled'];
export const TASK_PRIORITIES = ['low', 'normal', 'high', 'urgent'];

const taskSchema = new mongoose.Schema(
  {
    teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, trim: true, maxlength: 4000 },
    caseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Case' },
    clientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    dueAt: { type: Date, index: true },
    priority: { type: String, enum: TASK_PRIORITIES, default: 'normal' },
    status: { type: String, enum: TASK_STATUSES, default: 'todo', index: true },
    completedAt: { type: Date },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true },
);

taskSchema.index({ teamId: 1, assignedTo: 1, status: 1, dueAt: 1 });

export const Task = mongoose.model('Task', taskSchema);
