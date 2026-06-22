import { AppError } from '../../common/utils/appError';
import { getSocket } from '../../common/utils/socket';
import { AnnouncementModel } from './model';

export class AnnouncementService {
  static async list() {
    return AnnouncementModel.find({ published: true }).populate('authorId', 'firstName lastName email').lean();
  }

  static async adminList() {
    return AnnouncementModel.find().populate('authorId', 'firstName lastName email').sort({ createdAt: -1 }).lean();
  }

  static async create(authorId: string, payload: Record<string, unknown>) {
    const announcement = await AnnouncementModel.create({
      ...payload,
      authorId,
      publishedAt: payload.published ? new Date() : undefined,
    });

    if (announcement.published) {
      getSocket()?.emit('announcement:published', {
        id: announcement.id,
        title: announcement.title,
      });
    }

    return announcement;
  }

  static async update(id: string, payload: Record<string, unknown>) {
    const announcement = await AnnouncementModel.findByIdAndUpdate(
      id,
      {
        ...payload,
        publishedAt: payload.published ? new Date() : undefined,
      },
      { new: true },
    );
    if (!announcement) {
      throw new AppError('Announcement not found', 404);
    }

    if (announcement.published) {
      getSocket()?.emit('announcement:published', {
        id: announcement.id,
        title: announcement.title,
      });
    }

    return announcement;
  }

  static async remove(id: string) {
    const announcement = await AnnouncementModel.findByIdAndDelete(id);
    if (!announcement) {
      throw new AppError('Announcement not found', 404);
    }
    return announcement;
  }

  static async markRead(id: string, userId: string) {
    const announcement = await AnnouncementModel.findById(id);
    if (!announcement) {
      throw new AppError('Announcement not found', 404);
    }
    if (!announcement.readReceipts.some((receipt) => receipt.toString() === userId)) {
      announcement.readReceipts.push(userId as never);
      await announcement.save();
    }
    return announcement;
  }
}
