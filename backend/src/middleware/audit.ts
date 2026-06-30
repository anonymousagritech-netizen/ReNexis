import { Request } from 'express';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

interface AuditParams {
  req: Request;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'LOGIN' | 'EXPORT' | 'LOGOUT';
  entityName: string;
  recordId?: string;
  beforeData?: unknown;
  afterData?: unknown;
}

/**
 * Writes a single immutable audit log entry.
 * Call this explicitly inside every mutating service function —
 * centralizing it here keeps the call-site one-liner while guaranteeing
 * every write captures actor, IP, and before/after state for regulators.
 */
export async function writeAudit({ req, action, entityName, recordId, beforeData, afterData }: AuditParams) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: req.user?.userId,
        action,
        entityName,
        recordId,
        beforeData: beforeData as any,
        afterData: afterData as any,
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      },
    });
  } catch (err) {
    // Audit logging must never crash the primary transaction, but must be visible in logs.
    logger.error({ err }, 'Failed to write audit log entry');
  }
}
