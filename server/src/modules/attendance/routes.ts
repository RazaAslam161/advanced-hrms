import { Router } from 'express';
import { authenticate } from '../../common/middleware/auth';
import { authorize } from '../../common/middleware/rbac';
import { validate } from '../../common/middleware/validate';
import {
  approveOvertime,
  attendanceDashboard,
  checkIn,
  checkOut,
  createShift,
  listAttendance,
  listShifts,
  monthlyAttendanceReport,
  requestOvertime,
  updateShift,
} from './controller';
import { attendanceActionSchema, overtimeRequestSchema, shiftSchema } from './validators';

const router = Router();

router.use(authenticate);
router.get('/', authorize(['superAdmin', 'admin', 'manager', 'employee'], ['attendance.read']), listAttendance);
router.get('/dashboard', authorize(['superAdmin', 'admin', 'manager', 'employee'], ['attendance.read']), attendanceDashboard);
router.get('/shifts', authorize(['superAdmin', 'admin', 'manager'], ['attendance.read']), listShifts);
router.post('/shifts', authorize(['superAdmin', 'admin'], ['attendance.manage']), validate({ body: shiftSchema }), createShift);
router.patch('/shifts/:id', authorize(['superAdmin', 'admin'], ['attendance.manage']), validate({ body: shiftSchema.partial() }), updateShift);
router.post('/check-in', authorize(['admin', 'manager', 'employee'], ['attendance.checkin']), validate({ body: attendanceActionSchema }), checkIn);
router.post('/check-out', authorize(['admin', 'manager', 'employee'], ['attendance.checkout']), validate({ body: attendanceActionSchema }), checkOut);
router.post('/overtime', authorize(['superAdmin', 'admin', 'manager', 'employee'], ['attendance.read']), validate({ body: overtimeRequestSchema }), requestOvertime);
router.patch('/overtime/:id', authorize(['superAdmin', 'admin', 'manager'], ['attendance.approve']), approveOvertime);
router.get('/monthly/:employeeId', authorize(['superAdmin', 'admin', 'manager', 'employee'], ['attendance.read']), monthlyAttendanceReport);

export { router as attendanceRouter };
