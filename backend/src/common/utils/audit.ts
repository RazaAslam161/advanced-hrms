import { AuditLogModel } from '../../modules/analytics/model';

export const createAuditLog = async (input: {
  actorId?: string;
  module: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) => {
  await AuditLogModel.create({
    actorId: input.actorId,
    module: input.module,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: input.metadata ?? {},
  });
};
