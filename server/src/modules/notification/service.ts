import nodemailer from 'nodemailer';
import { env } from '../../config/env';
import { AppError } from '../../common/utils/appError';
import { NotificationModel, NotificationPreferenceModel } from './model';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: false,
  auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
});

export class NotificationService {
  static async list(userId: string) {
    return NotificationModel.find({ $or: [{ userId }, { userId: { $exists: false } }] }).sort({ createdAt: -1 }).lean();
  }

  static async mark(id: string, read: boolean, userId: string) {
    const notification = await NotificationModel.findOneAndUpdate(
      { _id: id, $or: [{ userId }, { userId: { $exists: false } }] },
      { read },
      { new: true },
    );
    if (!notification) {
      throw new AppError('Notification not found', 404);
    }
    return notification;
  }

  static async unreadCount(userId: string) {
    return NotificationModel.countDocuments({ $or: [{ userId }, { userId: { $exists: false } }], read: false });
  }

  static async getPreferences(userId: string) {
    return NotificationPreferenceModel.findOneAndUpdate(
      { userId },
      {},
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    );
  }

  static async updatePreferences(userId: string, preferences: Record<string, unknown>) {
    return NotificationPreferenceModel.findOneAndUpdate(
      { userId },
      preferences,
      {
        new: true,
        upsert: true,
      },
    );
  }

  static async sendEmailNotification(to: string, subject: string, text: string) {
    await transporter.sendMail({
      from: env.SMTP_FROM,
      to,
      subject,
      text,
    });
  }
}
