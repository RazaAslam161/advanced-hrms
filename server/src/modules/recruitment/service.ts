import { format } from 'date-fns';
import { AppError } from '../../common/utils/appError';
import { persistUpload } from '../../common/utils/storage';
import { createDocumentBuffer, renderBrandedHeader } from '../../common/utils/pdf';
import {
  ApplicationModel,
  InterviewModel,
  JobPostModel,
  OfferLetterModel,
  OnboardingChecklistModel,
} from './model';

const defaultOnboardingItems = [
  'Issue offer acceptance email',
  'Create official email account',
  'Share HR policies and welcome pack',
  'Assign equipment and system access',
  'Schedule orientation and team introduction',
];

const buildIcsInvite = (input: { title: string; start: Date; durationMinutes: number; description?: string }) => {
  const end = new Date(input.start.getTime() + input.durationMinutes * 60 * 1000);
  const formatDate = (date: Date) => format(date, "yyyyMMdd'T'HHmmss'Z'");
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//NEXUS HRMS//EN',
    'BEGIN:VEVENT',
    `SUMMARY:${input.title}`,
    `DTSTART:${formatDate(input.start)}`,
    `DTEND:${formatDate(end)}`,
    `DESCRIPTION:${input.description ?? ''}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\n');
};

export class RecruitmentService {
  static async listJobs(publicOnly = false) {
    return JobPostModel.find(publicOnly ? { status: 'published' } : {}).populate('department', 'name code').lean();
  }

  static async getJob(idOrSlug: string, publicOnly = false) {
    const filter = publicOnly
      ? { status: 'published', $or: [{ _id: idOrSlug }, { slug: idOrSlug }] }
      : { $or: [{ _id: idOrSlug }, { slug: idOrSlug }] };
    const job = await JobPostModel.findOne(filter).populate('department', 'name code').lean();
    if (!job) {
      throw new AppError('Job post not found', 404);
    }
    return job;
  }

  static async createJob(payload: Record<string, unknown>) {
    return JobPostModel.create(payload);
  }

  static async updateJob(id: string, payload: Record<string, unknown>) {
    const job = await JobPostModel.findByIdAndUpdate(id, payload, { new: true });
    if (!job) {
      throw new AppError('Job post not found', 404);
    }
    return job;
  }

  static async submitApplication(
    payload: { jobPostId: string; name: string; email: string; phone?: string; coverLetter?: string },
    file?: Express.Multer.File,
  ) {
    const job = await JobPostModel.findById(payload.jobPostId);
    if (!job || job.status !== 'published') {
      throw new AppError('Job post is not open for applications', 400);
    }

    const resume = file ? await persistUpload(file, 'resumes', false) : null;
    return ApplicationModel.create({
      ...payload,
      email: payload.email.toLowerCase(),
      resumeUrl: resume?.url,
      resumeKey: resume?.key,
      stage: 'Applied',
    });
  }

  static async listApplications(jobPostId?: string) {
    return ApplicationModel.find(jobPostId ? { jobPostId } : {})
      .populate('jobPostId', 'title slug status')
      .sort({ updatedAt: -1 })
      .lean();
  }

  static async moveApplication(id: string, stage: string) {
    const application = await ApplicationModel.findByIdAndUpdate(id, { stage }, { new: true });
    if (!application) {
      throw new AppError('Application not found', 404);
    }

    if (stage === 'Hired') {
      await OnboardingChecklistModel.findOneAndUpdate(
        { applicationId: application._id },
        {
          applicationId: application._id,
          items: defaultOnboardingItems.map((title) => ({ title, completed: false })),
          owner: 'HR',
          status: 'pending',
        },
        { upsert: true, new: true },
      );
    }

    return application;
  }

  static async scheduleInterview(payload: {
    applicationId: string;
    scheduledAt: string;
    durationMinutes: number;
    interviewer: string;
    meetingLink?: string;
    notes?: string;
  }) {
    const interview = await InterviewModel.create({
      ...payload,
      scheduledAt: new Date(payload.scheduledAt),
    });

    return {
      interview,
      calendarInvite: buildIcsInvite({
        title: `Interview - ${payload.interviewer}`,
        start: new Date(payload.scheduledAt),
        durationMinutes: payload.durationMinutes,
        description: payload.notes,
      }),
    };
  }

  static async createOffer(payload: Record<string, unknown>) {
    return OfferLetterModel.create(payload);
  }

  static async generateOfferPdf(id: string) {
    const offer = await OfferLetterModel.findById(id).populate({
      path: 'applicationId',
      select: 'name email',
    });
    if (!offer) {
      throw new AppError('Offer letter not found', 404);
    }

    const application = offer.applicationId as unknown as { name: string; email: string };

    return createDocumentBuffer((doc) => {
      renderBrandedHeader(doc, offer.title);
      doc.text(`Candidate: ${application.name}`);
      doc.text(`Salary Offer: ${offer.salary}`);
      doc.moveDown();
      doc.text(offer.content);
    });
  }

  static async getOnboarding(applicationId: string) {
    return OnboardingChecklistModel.findOne({ applicationId }).lean();
  }

  static async updateOnboarding(applicationId: string, items: Array<{ title: string; completed: boolean }>) {
    return OnboardingChecklistModel.findOneAndUpdate(
      { applicationId },
      { items, status: items.every((item) => item.completed) ? 'completed' : 'inProgress' },
      { upsert: true, new: true },
    );
  }
}
