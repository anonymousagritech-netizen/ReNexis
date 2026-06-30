import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { errorHandler, notFoundHandler } from '@/middleware/errorHandler';

import authRoutes from '@/modules/auth/auth.routes';
import partyRoutes from '@/modules/parties/party.routes';
import contractRoutes from '@/modules/contracts/contract.routes';
import riskRoutes from '@/modules/risks/risk.routes';
import claimRoutes from '@/modules/claims/claim.routes';
import premiumRoutes from '@/modules/premiums/premium.routes';
import accountingRoutes from '@/modules/accounting/accounting.routes';
import investmentRoutes from '@/modules/investments/investment.routes';
import generalLedgerRoutes from '@/modules/generalLedger/gl.routes';
import complianceRoutes from '@/modules/compliance/compliance.routes';
import reportingRoutes from '@/modules/reporting/reporting.routes';
import lifecycleRoutes from '@/modules/lifecycle/lifecycle.routes';
import entityRoutes from '@/modules/entities/entity.routes';
import auditRoutes from '@/modules/audit/audit.routes';
import dashboardRoutes from '@/modules/dashboard/dashboard.routes';
import documentRoutes from '@/modules/documents/document.routes';
import notificationRoutes from '@/modules/notifications/notification.routes';
import catastropheRoutes from '@/modules/catastrophe/catastrophe.routes';

export function createApp() {
  const app = express();

  const allowedOrigins = (process.env.CORS_ORIGINS || '*').split(',').map((o) => o.trim());

  app.use(helmet());
  app.use(
    cors({
      origin: allowedOrigins.includes('*') ? true : allowedOrigins,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 600 });
  app.use('/api', limiter);

  app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'renexis-backend', time: new Date().toISOString() }));

  app.use('/api/auth', authRoutes);
  app.use('/api/entities', entityRoutes);
  app.use('/api/parties', partyRoutes);
  app.use('/api/contracts', contractRoutes);
  app.use('/api/risks', riskRoutes);
  app.use('/api/claims', claimRoutes);
  app.use('/api/premiums', premiumRoutes);
  app.use('/api/accounting', accountingRoutes);
  app.use('/api/investments', investmentRoutes);
  app.use('/api/gl', generalLedgerRoutes);
  app.use('/api/compliance', complianceRoutes);
  app.use('/api/reporting', reportingRoutes);
  app.use('/api/lifecycle', lifecycleRoutes);
  app.use('/api/audit', auditRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/documents', documentRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/catastrophe-events', catastropheRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
