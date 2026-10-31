import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({
  teamId: { type: mongoose.Schema.Types.ObjectId, required: true },
  key: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

counterSchema.index({ teamId: 1, key: 1 }, { unique: true });

export const Counter = mongoose.model('Counter', counterSchema);

export async function nextSeq(teamId, key) {
  const doc = await Counter.findOneAndUpdate(
    { teamId, key },
    { $inc: { seq: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  return doc.seq;
}
