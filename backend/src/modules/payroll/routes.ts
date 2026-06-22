import { Router } from 'express';
import { authenticate } from '../../common/middleware/auth';
import { authorize } from '../../common/middleware/rbac';
import { validate } from '../../common/middleware/validate';
import {
  approvePayroll,
  createLoanAdvance,
  exportBankFile,
  getPayslip,
  listPayrollRecords,
  listPayrollRuns,
  processPayroll,
} from './controller';
import { loanAdvanceSchema, payrollRunSchema } from './validators';

const router = Router();

router.use(authenticate);
router.get('/runs', authorize(['superAdmin', 'admin'], ['payroll.read']), listPayrollRuns);
router.get('/records', authorize(['superAdmin', 'admin', 'employee', 'manager'], ['payroll.read']), listPayrollRecords);
router.post('/process', authorize(['superAdmin', 'admin'], ['payroll.process']), validate({ body: payrollRunSchema }), processPayroll);
router.patch('/runs/:id/approve', authorize(['superAdmin', 'admin'], ['payroll.approve']), approvePayroll);
router.post('/loan-advances', authorize(['superAdmin', 'admin'], ['payroll.process']), validate({ body: loanAdvanceSchema }), createLoanAdvance);
router.get('/records/:id/payslip', authorize(['superAdmin', 'admin', 'employee', 'manager'], ['payroll.read']), getPayslip);
router.get('/runs/:id/bank-file', authorize(['superAdmin', 'admin'], ['payroll.export']), exportBankFile);

export { router as payrollRouter };
