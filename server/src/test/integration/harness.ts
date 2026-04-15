import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import type { Express } from 'express';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

interface LoadedModules {
  createApp: () => Express;
  connectDatabase: () => Promise<void>;
  AuthService: typeof import('../../modules/auth/service').AuthService;
  signAccessToken: typeof import('../../common/utils/jwt').signAccessToken;
  UserModel: typeof import('../../modules/auth/model').UserModel;
  AuthSessionModel: typeof import('../../modules/auth/model').AuthSessionModel;
  DepartmentModel: typeof import('../../modules/department/model').DepartmentModel;
  EmployeeModel: typeof import('../../modules/employee/model').EmployeeModel;
  EmployeeActivityModel: typeof import('../../modules/employee/model').EmployeeActivityModel;
  LeavePolicyModel: typeof import('../../modules/leave/model').LeavePolicyModel;
  LeaveBalanceModel: typeof import('../../modules/leave/model').LeaveBalanceModel;
  LeaveRequestModel: typeof import('../../modules/leave/model').LeaveRequestModel;
  PayrollRunModel: typeof import('../../modules/payroll/model').PayrollRunModel;
  PayrollRecordModel: typeof import('../../modules/payroll/model').PayrollRecordModel;
  LoanAdvanceModel: typeof import('../../modules/payroll/model').LoanAdvanceModel;
  NotificationModel: typeof import('../../modules/notification/model').NotificationModel;
  NotificationPreferenceModel: typeof import('../../modules/notification/model').NotificationPreferenceModel;
  ProjectModel: typeof import('../../modules/project/model').ProjectModel;
  ShiftModel: typeof import('../../modules/attendance/model').ShiftModel;
  AttendanceRecordModel: typeof import('../../modules/attendance/model').AttendanceRecordModel;
  OvertimeRequestModel: typeof import('../../modules/attendance/model').OvertimeRequestModel;
}

export interface IntegrationHarness {
  app: Express;
  mongoServer: MongoMemoryServer;
  uploadRoot: string;
  modules: LoadedModules;
  resetDatabase: () => Promise<void>;
  shutdown: () => Promise<void>;
}

const loadModules = async (): Promise<LoadedModules & { createApp: () => Express; connectDatabase: () => Promise<void> }> => {
  const appModule = await import('../../app');
  const dbModule = await import('../../config/db');
  const authServiceModule = await import('../../modules/auth/service');
  const authModelModule = await import('../../modules/auth/model');
  const departmentModelModule = await import('../../modules/department/model');
  const employeeModelModule = await import('../../modules/employee/model');
  const leaveModelModule = await import('../../modules/leave/model');
  const payrollModelModule = await import('../../modules/payroll/model');
  const notificationModelModule = await import('../../modules/notification/model');
  const projectModelModule = await import('../../modules/project/model');
  const attendanceModelModule = await import('../../modules/attendance/model');
  const jwtModule = await import('../../common/utils/jwt');

  return {
    createApp: appModule.createApp,
    connectDatabase: dbModule.connectDatabase,
    AuthService: authServiceModule.AuthService,
    signAccessToken: jwtModule.signAccessToken,
    UserModel: authModelModule.UserModel,
    AuthSessionModel: authModelModule.AuthSessionModel,
    DepartmentModel: departmentModelModule.DepartmentModel,
    EmployeeModel: employeeModelModule.EmployeeModel,
    EmployeeActivityModel: employeeModelModule.EmployeeActivityModel,
    LeavePolicyModel: leaveModelModule.LeavePolicyModel,
    LeaveBalanceModel: leaveModelModule.LeaveBalanceModel,
    LeaveRequestModel: leaveModelModule.LeaveRequestModel,
    PayrollRunModel: payrollModelModule.PayrollRunModel,
    PayrollRecordModel: payrollModelModule.PayrollRecordModel,
    LoanAdvanceModel: payrollModelModule.LoanAdvanceModel,
    NotificationModel: notificationModelModule.NotificationModel,
    NotificationPreferenceModel: notificationModelModule.NotificationPreferenceModel,
    ProjectModel: projectModelModule.ProjectModel,
    ShiftModel: attendanceModelModule.ShiftModel,
    AttendanceRecordModel: attendanceModelModule.AttendanceRecordModel,
    OvertimeRequestModel: attendanceModelModule.OvertimeRequestModel,
  };
};

const clearServerModuleCache = () => {
  const serverSourceSegment = `${path.sep}server${path.sep}src${path.sep}`;

  Object.keys(require.cache).forEach((cacheKey) => {
    if (cacheKey.includes(serverSourceSegment) && !cacheKey.includes(`${path.sep}node_modules${path.sep}`)) {
      delete require.cache[cacheKey];
    }
  });
};

export const createIntegrationHarness = async (): Promise<IntegrationHarness> => {
  const mongoServer = await MongoMemoryServer.create();
  const uploadRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'nexus-int-uploads-'));

  process.env.NODE_ENV = 'test';
  process.env.MONGODB_URI = mongoServer.getUri();
  process.env.CLIENT_URL = 'http://localhost:5173';
  process.env.REDIS_URL = 'redis://127.0.0.1:6379';
  process.env.QUEUE_DRIVER = 'inline';
  process.env.FILE_STORAGE_DRIVER = 'local';
  process.env.UPLOAD_DIR = uploadRoot;

  clearServerModuleCache();

  const modules = await loadModules();
  await modules.connectDatabase();

  const syncIndexes = async () => {
    await Promise.all([
      modules.UserModel.syncIndexes(),
      modules.AuthSessionModel.syncIndexes(),
      modules.DepartmentModel.syncIndexes(),
      modules.EmployeeModel.syncIndexes(),
      modules.EmployeeActivityModel.syncIndexes(),
      modules.LeavePolicyModel.syncIndexes(),
      modules.LeaveBalanceModel.syncIndexes(),
      modules.LeaveRequestModel.syncIndexes(),
      modules.PayrollRunModel.syncIndexes(),
      modules.PayrollRecordModel.syncIndexes(),
      modules.LoanAdvanceModel.syncIndexes(),
      modules.NotificationModel.syncIndexes(),
      modules.NotificationPreferenceModel.syncIndexes(),
      modules.ProjectModel.syncIndexes(),
      modules.ShiftModel.syncIndexes(),
      modules.AttendanceRecordModel.syncIndexes(),
      modules.OvertimeRequestModel.syncIndexes(),
    ]);
  };

  await syncIndexes();

  return {
    app: modules.createApp(),
    mongoServer,
    uploadRoot,
    modules,
    resetDatabase: async () => {
      await mongoose.connection.dropDatabase();
      await syncIndexes();
    },
    shutdown: async () => {
      await mongoose.disconnect();
      await mongoServer.stop();
      await fs.rm(uploadRoot, { recursive: true, force: true });
    },
  };
};
