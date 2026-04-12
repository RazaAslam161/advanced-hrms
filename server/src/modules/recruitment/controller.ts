import type { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { sendSuccess } from '../../common/utils/response';
import { RecruitmentService } from './service';

export const listJobs = asyncHandler(async (_req: Request, res: Response) => {
  const jobs = await RecruitmentService.listJobs(false);
  res.json(sendSuccess('Job posts fetched successfully', jobs));
});

export const getJob = asyncHandler(async (req: Request, res: Response) => {
  const job = await RecruitmentService.getJob(String(req.params.id), false);
  res.json(sendSuccess('Job post fetched successfully', job));
});

export const createJob = asyncHandler(async (req: Request, res: Response) => {
  const job = await RecruitmentService.createJob(req.body);
  res.status(201).json(sendSuccess('Job post created successfully', job));
});

export const updateJob = asyncHandler(async (req: Request, res: Response) => {
  const job = await RecruitmentService.updateJob(String(req.params.id), req.body);
  res.json(sendSuccess('Job post updated successfully', job));
});

export const publicCareers = asyncHandler(async (_req: Request, res: Response) => {
  const jobs = await RecruitmentService.listJobs(true);
  res.json(sendSuccess('Career opportunities fetched successfully', jobs));
});

export const publicCareerDetail = asyncHandler(async (req: Request, res: Response) => {
  const job = await RecruitmentService.getJob(String(req.params.slug), true);
  res.json(sendSuccess('Career opportunity fetched successfully', job));
});

export const submitApplication = asyncHandler(async (req: Request, res: Response) => {
  const application = await RecruitmentService.submitApplication(req.body, req.file ?? undefined);
  res.status(201).json(sendSuccess('Application submitted successfully', application));
});

export const listApplications = asyncHandler(async (req: Request, res: Response) => {
  const applications = await RecruitmentService.listApplications(req.query.jobPostId as string | undefined);
  res.json(sendSuccess('Applications fetched successfully', applications));
});

export const moveApplication = asyncHandler(async (req: Request, res: Response) => {
  const application = await RecruitmentService.moveApplication(String(req.params.id), req.body.stage);
  res.json(sendSuccess('Application stage updated successfully', application));
});

export const scheduleInterview = asyncHandler(async (req: Request, res: Response) => {
  const result = await RecruitmentService.scheduleInterview(req.body);
  res.status(201).json(sendSuccess('Interview scheduled successfully', result));
});

export const createOffer = asyncHandler(async (req: Request, res: Response) => {
  const offer = await RecruitmentService.createOffer(req.body);
  res.status(201).json(sendSuccess('Offer letter created successfully', offer));
});

export const getOfferPdf = asyncHandler(async (req: Request, res: Response) => {
  const buffer = await RecruitmentService.generateOfferPdf(String(req.params.id));
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="offer-${req.params.id}.pdf"`);
  res.send(buffer);
});

export const getOnboarding = asyncHandler(async (req: Request, res: Response) => {
  const onboarding = await RecruitmentService.getOnboarding(String(req.params.applicationId));
  res.json(sendSuccess('Onboarding checklist fetched successfully', onboarding));
});

export const updateOnboarding = asyncHandler(async (req: Request, res: Response) => {
  const onboarding = await RecruitmentService.updateOnboarding(String(req.params.applicationId), req.body.items);
  res.json(sendSuccess('Onboarding checklist updated successfully', onboarding));
});
