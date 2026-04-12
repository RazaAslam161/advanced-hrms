import type { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { sendSuccess } from '../../common/utils/response';
import { AnalyticsService } from './service';

export const analyticsDashboard = asyncHandler(async (_req: Request, res: Response) => {
  const dashboard = await AnalyticsService.dashboard();
  res.json(sendSuccess('Analytics dashboard fetched successfully', dashboard));
});

export const analyticsCharts = asyncHandler(async (_req: Request, res: Response) => {
  const charts = await AnalyticsService.charts();
  res.json(sendSuccess('Analytics charts fetched successfully', charts));
});

export const buildReport = asyncHandler(async (req: Request, res: Response) => {
  const buffer = await AnalyticsService.buildReport(req.body);
  if (req.body.format === 'pdf') {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="report.pdf"');
  } else {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="report.xlsx"');
  }
  res.send(buffer);
});

export const naturalLanguageQuery = asyncHandler(async (req: Request, res: Response) => {
  const result = await AnalyticsService.naturalLanguageQuery(req.body.query);
  res.json(sendSuccess('Natural language query parsed successfully', result));
});
