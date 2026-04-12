import { Schema, model } from 'mongoose';

const announcementSchema = new Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    audience: { type: String, enum: ['all', 'department'], default: 'all', index: true },
    department: { type: Schema.Types.ObjectId, ref: 'Department' },
    published: { type: Boolean, default: false, index: true },
    publishedAt: { type: Date },
    readReceipts: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true },
);

export const AnnouncementModel = model('Announcement', announcementSchema);
