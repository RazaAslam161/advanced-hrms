import type { Request, Response } from 'express';
import { asyncHandler } from '../../common/utils/asyncHandler';
import { sendSuccess } from '../../common/utils/response';
import type { AuthenticatedRequest } from '../../common/types/http';
import { PayrollService } from './service';

export const listPayrollRuns = asyncHandler(async (_req: Request, res: Response) => {
  const runs = await PayrollService.listRuns();
  res.json(sendSuccess('Payroll runs fetched successfully', runs));
});

export const listPayrollRecords = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const records = await PayrollService.listRecords(req.query as Record<string, string>, req.user);
  res.json(sendSuccess('Payroll records fetched successfully', records));
});

export const processPayroll = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const run = await PayrollService.process(req.body, req.user!.userId);
  res.status(201).json(sendSuccess('Payroll run created successfully', run));
});

export const approvePayroll = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const run = await PayrollService.approve(String(req.params.id), req.user!.userId);
  res.json(sendSuccess('Payroll run approved successfully', run));
});

export const createLoanAdvance = asyncHandler(async (req: Request, res: Response) => {
  const entry = await PayrollService.createLoanAdvance(req.body);
  res.status(201).json(sendSuccess('Loan or advance created successfully', entry));
});

export const getPayslip = asyncHandler(async (req: Request, res: Response) => {
  const buffer = await PayrollService.generatePayslip(String(req.params.id));
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="payslip-${req.params.id}.pdf"`);
  res.send(buffer);
});

export const exportBankFile = asyncHandler(async (req: Request, res: Response) => {
  const buffer = await PayrollService.generateBankFile(String(req.params.id));
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="payroll-bank-file-${req.params.id}.xlsx"`);
  res.send(buffer);
});
