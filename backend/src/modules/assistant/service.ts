import { startOfDay } from 'date-fns';
import { env } from '../../config/env';
import { logger } from '../../common/utils/logger';
import { AttendanceRecordModel } from '../attendance/model';
import { EmployeeModel } from '../employee/model';
import { LeaveRequestModel } from '../leave/model';
import { NotificationModel } from '../notification/model';
import { PayrollRunModel } from '../payroll/model';
import { ProjectModel } from '../project/model';
import type { AssistantChatInput, AssistantMetricSnapshot, AssistantReply, AssistantUserContext } from './types';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type GeminiClient = { generateContentStream: (params: unknown) => Promise<AsyncIterable<{ text?: string }>> };
let geminiClientPromise: Promise<GeminiClient | null> | null = null;

const getGeminiClient = async (): Promise<GeminiClient | null> => {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  if (!geminiClientPromise) {
    geminiClientPromise = (async () => {
      try {
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey });
        return ai.models as unknown as GeminiClient;
      } catch (error) {
        logger.error(`Gemini SDK unavailable, assistant will use rule-based replies. ${(error as Error).message}`);
        return null;
      }
    })();
  }

  return geminiClientPromise;
};

const buildSystemInstruction = (
  input: AssistantChatInput,
  user: AssistantUserContext,
  metrics: AssistantMetricSnapshot,
): string => {
  const focus = roleFocus[user.role];
  const pageTips = (pagePlaybook[input.pageLabel] ?? pagePlaybook.Dashboard).join(' ');
  const metricLine = `${metrics.activeEmployees} active employees, ${metrics.pendingLeaves} pending leave request(s), ${metrics.checkedInToday} checked in today, ${metrics.pendingPayrollRuns} payroll run(s) pending, ${metrics.activeProjects} active project(s), ${metrics.unreadNotifications} unread notification(s)`;

  return [
    'You are NEXUS, the built-in AI assistant inside the NEXUS HRMS platform built for Meta Labs Tech.',
    `The signed-in user has the role "${user.role}", focused on ${focus}.`,
    `They are currently on the "${input.pageLabel}" screen of the ${input.portal}.`,
    `Live company data right now: ${metricLine}.`,
    `Best practices for this page: ${pageTips}`,
    'Answer the user as a helpful, accurate HR assistant in under 130 words.',
    'Use the live data when it is relevant, keep a friendly professional tone, and prefer clear next steps.',
    'If a request falls outside an HR system, politely steer the user back to HR topics.',
    'Never invent employee names, salaries, or records that were not provided to you.',
  ].join(' ');
};

const OPENROUTER_FALLBACK_MODELS = [
  'deepseek/deepseek-chat-v3-0324:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemini-2.0-flash-exp:free',
  'mistralai/mistral-small-3.2-24b-instruct:free',
  'meta-llama/llama-3.1-8b-instruct:free',
  'qwen/qwen-2.5-72b-instruct:free',
];

const GROQ_FALLBACK_MODELS = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'gemma2-9b-it'];

const mergeModels = (configured: string, fallbacks: string[]): string[] => {
  const primary = configured
    .split(',')
    .map((model) => model.trim())
    .filter(Boolean);
  return [...new Set([...primary, ...fallbacks])];
};

async function* parseOpenAIStyleStream(label: string, response: Response): AsyncGenerator<string> {
  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => '');
    throw new Error(`${label} HTTP ${response.status}: ${detail.slice(0, 500)}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  for (;;) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) {
        continue;
      }

      const data = trimmed.slice(5).trim();
      if (data === '[DONE]') {
        return;
      }

      try {
        const parsed = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> };
        const token = parsed.choices?.[0]?.delta?.content;
        if (token) {
          yield token;
        }
      } catch {
        // Ignore keep-alive comments and partial JSON fragments.
      }
    }
  }
}

async function* streamFromGroq(model: string, systemInstruction: string, message: string): AsyncGenerator<string> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      stream: true,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: message },
      ],
    }),
  });

  yield* parseOpenAIStyleStream('Groq', response);
}

async function* streamFromOpenRouter(model: string, systemInstruction: string, message: string): AsyncGenerator<string> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': env.CLIENT_URL,
      'X-Title': 'NEXUS HRMS Assistant',
    },
    body: JSON.stringify({
      model,
      stream: true,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: message },
      ],
    }),
  });

  yield* parseOpenAIStyleStream('OpenRouter', response);
}

const roleFocus: Record<AssistantUserContext['role'], string> = {
  superAdmin: 'company-wide control, access governance, executive visibility and cross-module decisions',
  admin: 'HR operations, employee records, leave approvals, payroll processing and recruitment execution',
  manager: 'team attendance, project delivery, leave approvals and performance follow-up',
  employee: 'self-service actions, personal attendance, leave, payslips, project updates and company announcements',
  recruiter: 'job posts, candidate pipelines, interviews and hiring follow-up',
};

const pagePlaybook: Record<string, string[]> = {
  Dashboard: ['Check today metrics first.', 'Review unread notifications.', 'Open the module that has the highest pending workload.'],
  Employees: ['Use search or filters before creating a duplicate profile.', 'Create the employee account, then share the temporary credentials securely.', 'Archive rather than permanently deleting records.'],
  Departments: ['Confirm the department code is unique.', 'Assign a department head only after the employee profile exists.'],
  Attendance: ['Check who is currently clocked in.', 'Review late or half-day records before approving overtime.'],
  Leave: ['Check overlap and balance before approval.', 'Manager approval moves the request to HR; HR approval finalizes the balance deduction.'],
  Projects: ['Update progress with a clear summary.', 'Add blockers early so managers can respond before delivery slips.'],
  Payroll: ['Process payroll as maker first.', 'Review deductions, tax and loans before approval.', 'Approve only after checking salary totals.'],
  Performance: ['Use objectives and feedback together.', 'Keep ratings evidence-based before calibration.'],
  Recruitment: ['Keep candidates moving through the ATS stages.', 'Add interview notes immediately after each call.'],
  Analytics: ['Start with date range and module filters.', 'Export PDF or Excel only after reviewing the chart data.'],
  Notifications: ['Mark completed alerts as read.', 'Keep high-priority leave, payroll and review alerts visible.'],
  Pulse: ['Use short survey questions.', 'Recognize specific behavior rather than generic praise.'],
  Gigs: ['Apply only where skills match.', 'Owners should keep applicants updated.'],
  Announcements: ['Publish only after checking audience scope.', 'Use department targeting for non-company-wide updates.'],
  Settings: ['Update profile and security details from this page.', 'Use password changes carefully and sign out old sessions if needed.'],
  Access: ['Avoid changing your own privileged access.', 'Assign role permissions based on the person’s actual responsibility.'],
};

const defaultSuggestions: Record<AssistantUserContext['role'], string[]> = {
  superAdmin: ['Show me critical HR risks', 'How do I create secure credentials?', 'What should I review today?'],
  admin: ['Help me approve leave correctly', 'How do I process payroll?', 'How do I add a new employee?'],
  manager: ['What team work needs attention?', 'How do I approve leave?', 'How should I update project progress?'],
  employee: ['How do I apply for leave?', 'How do I update project status?', 'Where can I check my payslip?'],
  recruiter: ['How do I move a candidate?', 'How do I publish a job?', 'What hiring tasks should I do today?'],
};

const getMetricSnapshot = async (userId: string): Promise<AssistantMetricSnapshot> => {
  const today = startOfDay(new Date());
  const [activeEmployees, pendingLeaves, checkedInToday, pendingPayrollRuns, activeProjects, unreadNotifications] = await Promise.all([
    EmployeeModel.countDocuments({ isDeleted: false, status: { $in: ['active', 'probation'] } }),
    LeaveRequestModel.countDocuments({ status: { $in: ['pendingManager', 'pendingHR'] } }),
    AttendanceRecordModel.countDocuments({ date: { $gte: today }, checkIn: { $exists: true } }),
    PayrollRunModel.countDocuments({ status: { $in: ['draft', 'processing', 'pendingApproval'] } }),
    ProjectModel.countDocuments({ isDeleted: false, status: { $in: ['planning', 'active', 'onHold'] } }),
    NotificationModel.countDocuments({ userId, read: false }),
  ]);

  return {
    activeEmployees,
    pendingLeaves,
    checkedInToday,
    pendingPayrollRuns,
    activeProjects,
    unreadNotifications,
  };
};

const findIntent = (message: string) => {
  const normalized = message.toLowerCase();
  if (/(password|credential|login|access|permission|role)/.test(normalized)) {
    return 'access';
  }
  if (/(leave|vacation|sick|casual|annual|approve)/.test(normalized)) {
    return 'leave';
  }
  if (/(payroll|salary|payslip|tax|loan|deduction)/.test(normalized)) {
    return 'payroll';
  }
  if (/(attendance|check.?in|check.?out|late|overtime)/.test(normalized)) {
    return 'attendance';
  }
  if (/(project|task|status|blocker|progress)/.test(normalized)) {
    return 'project';
  }
  if (/(candidate|job|recruit|interview|offer|hiring)/.test(normalized)) {
    return 'recruitment';
  }
  if (/(profile|photo|settings|security|notification)/.test(normalized)) {
    return 'settings';
  }
  return 'general';
};

const buildActions = (intent: string, role: AssistantUserContext['role'], metrics: AssistantMetricSnapshot) => {
  const baseActions: Record<string, string[]> = {
    access: ['Open Access page', 'Confirm the user role', 'Issue temporary credentials only through the portal'],
    leave: ['Check leave balance', `Review ${metrics.pendingLeaves} pending leave request(s)`, 'Approve in the correct manager-to-HR order'],
    payroll: ['Review payroll run status', `Check ${metrics.pendingPayrollRuns} pending payroll run(s)`, 'Verify deductions before approval'],
    attendance: ['Open Attendance dashboard', `Review ${metrics.checkedInToday} checked-in employee(s) today`, 'Check overtime before approval'],
    project: ['Open Projects page', `Review ${metrics.activeProjects} active project(s)`, 'Ask team members to add blockers'],
    recruitment: ['Open Recruitment pipeline', 'Move candidates stage-by-stage', 'Record interview notes'],
    settings: ['Open Settings', 'Update profile/security carefully', 'Review notification preferences'],
    general: ['Review dashboard metrics', `Read ${metrics.unreadNotifications} unread notification(s)`, 'Open the related module from the sidebar'],
  };

  const actions = baseActions[intent] ?? baseActions.general;
  if (role === 'employee') {
    return actions.filter((action) => !/(approve|payroll run|credentials|Access page)/i.test(action)).slice(0, 3);
  }
  if (role === 'recruiter') {
    return intent === 'recruitment' ? actions : ['Open Recruitment pipeline', 'Check candidate follow-ups', 'Review unread hiring alerts'];
  }
  return actions.slice(0, 3);
};

const buildReply = (
  input: AssistantChatInput,
  user: AssistantUserContext,
  metrics: AssistantMetricSnapshot,
  intent: string,
  actions: string[],
) => {
  const pageTips = pagePlaybook[input.pageLabel] ?? pagePlaybook.Dashboard;
  const focus = roleFocus[user.role];
  const metricLine = `Live context: ${metrics.activeEmployees} active employee(s), ${metrics.pendingLeaves} pending leave request(s), ${metrics.checkedInToday} checked in today, ${metrics.activeProjects} active project(s), and ${metrics.unreadNotifications} unread notification(s).`;

  if (intent === 'general') {
    return `I’m looking at your ${input.portal} on the ${input.pageLabel} page. Your role is focused on ${focus}. ${metricLine} Start with: ${pageTips[0]} Then: ${actions.join(' -> ')}.`;
  }

  return `For this ${intent} question, I’m using your role, current page, and live HRMS data. ${metricLine} Recommended next steps: ${actions.join(' -> ')}. Page-specific note: ${pageTips[0]}`;
};

export class AssistantService {
  static async prepareContext(input: AssistantChatInput, user: AssistantUserContext) {
    const metrics = await getMetricSnapshot(user.userId);
    const intent = findIntent(input.message);
    const actions = buildActions(intent, user.role, metrics);
    const suggestions = defaultSuggestions[user.role];
    return { metrics, intent, actions, suggestions };
  }

  static async chat(input: AssistantChatInput, user: AssistantUserContext): Promise<AssistantReply> {
    const { metrics, intent, actions, suggestions } = await this.prepareContext(input, user);

    return {
      reply: buildReply(input, user, metrics, intent, actions),
      actions,
      suggestions,
      context: {
        role: user.role,
        portal: input.portal,
        pageLabel: input.pageLabel,
        metrics,
      },
    };
  }

  static async *streamReply(
    input: AssistantChatInput,
    user: AssistantUserContext,
    metrics: AssistantMetricSnapshot,
    intent: string,
    actions: string[],
  ): AsyncGenerator<string> {
    const systemInstruction = buildSystemInstruction(input, user, metrics);

    if (env.GROQ_API_KEY) {
      let anyTokenSent = false;
      for (const model of mergeModels(env.GROQ_MODEL, GROQ_FALLBACK_MODELS)) {
        try {
          for await (const token of streamFromGroq(model, systemInstruction, input.message)) {
            anyTokenSent = true;
            yield token;
          }

          if (anyTokenSent) {
            return;
          }
        } catch (error) {
          logger.error(`Groq model "${model}" failed, trying next. ${(error as Error).message}`);
          if (anyTokenSent) {
            return;
          }
        }
      }
    }

    if (env.OPENROUTER_API_KEY) {
      let anyTokenSent = false;
      for (const model of mergeModels(env.OPENROUTER_MODEL, OPENROUTER_FALLBACK_MODELS)) {
        try {
          for await (const token of streamFromOpenRouter(model, systemInstruction, input.message)) {
            anyTokenSent = true;
            yield token;
          }

          if (anyTokenSent) {
            return;
          }
        } catch (error) {
          logger.error(`OpenRouter model "${model}" failed, trying next. ${(error as Error).message}`);
          if (anyTokenSent) {
            return;
          }
        }
      }
    }

    const client = await getGeminiClient();

    if (client) {
      try {
        const response = await client.generateContentStream({
          model: env.GEMINI_MODEL,
          contents: input.message,
          config: { systemInstruction },
        });

        let streamed = false;
        for await (const chunk of response) {
          if (chunk.text) {
            streamed = true;
            yield chunk.text;
          }
        }

        if (streamed) {
          return;
        }
      } catch (error) {
        logger.error(`Gemini stream failed, falling back to rule-based reply. ${(error as Error).message}`);
      }
    }

    const fallback = buildReply(input, user, metrics, intent, actions);
    for (const token of fallback.split(/(\s+)/)) {
      if (!token) {
        continue;
      }
      yield token;
      await delay(16);
    }
  }
}
