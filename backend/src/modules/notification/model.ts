import { Schema, model } from 'mongoose';

const notificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['leave', 'payroll', 'review', 'announcement', 'system'], required: true, index: true },
    channels: [{ type: String, enum: ['in-app', 'email'], default: 'in-app' }],
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

const notificationPreferenceSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    preferences: {
      leave: { email: { type: Boolean, default: true }, inApp: { type: Boolean, default: true } },
      payroll: { email: { type: Boolean, default: true }, inApp: { type: Boolean, default: true } },
      review: { email: { type: Boolean, default: true }, inApp: { type: Boolean, default: true } },
      announcement: { email: { type: Boolean, default: true }, inApp: { type: Boolean, default: true } },
      system: { email: { type: Boolean, default: false }, inApp: { type: Boolean, default: true } },
    },
  },
  { timestamps: true },
);

export const NotificationModel = model('Notification', notificationSchema);
export const NotificationPreferenceModel = model('NotificationPreference', notificationPreferenceSchema);
