import {
  before,
  createExpressServer,
  errorHandler,
  getLogger,
  notFound,
  route,
  validateBody,
} from '@devmoods/express-extras';
import { createSsrMiddleware } from '@devmoods/express-extras/vite/ssr';
import { admin } from '@devmoods/postgres-admin';
import express from 'express';

import { auth, filterUser } from './auth.js';
import { cache, postgres, redis } from './config.js';
import { enode, getVehicleSettings, saveVehicle } from './services.js';

export const app = express();

const logger = getLogger();

app.set('trust proxy', true);

app.use(before({ csrf: true }));
app.use(auth.before());

app.use('/api/auth', auth.createRouter());

app.use(
  '/admin',
  auth.isAuthorized((u) => u.isSuperuser),
  admin({
    postgres,
    uiOptions: {
      title: 'Citro 80.',
    },
  }),
);

app.post(
  '/api/setup',
  auth.isAuthorized(),
  route(async () => {
    const user = auth.useCurrentUser()!;
    logger.info('setup initiated', { user });
    const link = await enode.users.link(user.id);
    return {
      url: link.linkUrl,
    };
  }),
);

const getEnodeVehicles = cache.decorate(
  { expiresMs: 60 * 1000 },
  (userId: string) => enode.vehicles.listByUser(userId),
);

app.get(
  '/api/vehicles',
  auth.isAuthorized(),
  route(async () => {
    const user = auth.useCurrentUser()!;
    const linkedVehicles = await getEnodeVehicles(user.id);
    const settingsByVehicleId = await postgres.withConnection(async (tx) => {
      return getVehicleSettings(
        tx,
        linkedVehicles.data.map((v) => v.id),
      );
    });

    return linkedVehicles.data.map((v) => ({
      id: v.id,
      name: v.information.displayName,
      batteryLevel: v.chargeState.batteryLevel,
      isCharging: v.chargeState.isCharging,
      desiredMaxCharge: Number(
        settingsByVehicleId[v.id]?.['maxCharge'] || '75',
      ),
      isActive: settingsByVehicleId[v.id]?.['isActive'] || false,
    }));
  }),
);

app.put(
  '/api/charges/:vehicleId',
  auth.isAuthorized(),
  validateBody({
    type: 'object',
    properties: {
      maxCharge: { type: 'number' },
      isActive: { type: 'boolean' },
    },
  }),
  route(async (req) => {
    const user = auth.useCurrentUser()!;
    const vehicleId = req.params.vehicleId;
    const maxCharge = req.body.maxCharge;
    const isActive = req.body.isActive;
    const payload = { maxCharge, isActive };

    await postgres.transaction(async (tx) => {
      await saveVehicle(tx, user.id, vehicleId, payload);
    });

    return payload;
  }),
);

export async function createServer() {
  const onShutdown = async () => {
    await Promise.all([redis.quit(), postgres.end()]);
  };

  const healthCheck = async () => {
    await Promise.all([redis.ping(), postgres.query('SELECT 1')]);
  };

  const server = createExpressServer(app, {
    onShutdown,
    healthCheck,
  });

  const ssr = await createSsrMiddleware({
    async getInitialData() {
      const user = auth.useCurrentUser();
      return {
        user: user ? filterUser(user) : undefined,
      };
    },
  });
  app.use(ssr);
  app.use(notFound());
  app.use(errorHandler());

  return {
    app,
    async start() {
      await redis.connect();
      await server.start();
    },
  };
}
