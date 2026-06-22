import type { Role } from '../../common/constants/roles';

export interface AssistantChatInput {
  message: string;
  portal: string;
  pageLabel: string;
  pathname: string;
}

export interface AssistantUserContext {
  userId: string;
  email: string;
  role: Role;
  permissions: string[];
}

export interface AssistantMetricSnapshot {
  activeEmployees: number;
  pendingLeaves: number;
  checkedInToday: number;
  pendingPayrollRuns: number;
  activeProjects: number;
  unreadNotifications: number;
}

export interface AssistantReply {
  reply: string;
  actions: string[];
  suggestions: string[];
  context: {
    role: Role;
    portal: string;
    pageLabel: string;
    metrics: AssistantMetricSnapshot;
  };
}
