import {
  before,
  createExpressServer,
  createRouter,
  errorHandler,
  getLogger,
  notFound,
} from '@devmoods/express-extras';
import { createSsrMiddleware } from '@devmoods/express-extras/vite/ssr';
import { admin } from '@devmoods/postgres-admin';
import { type } from 'arktype';
import express from 'express';

import { auth, filterUser } from './auth.js';
import { postgres, redis } from './config.js';
import { type VehicleRecord } from './enode.js';
import { postSlackMessageJob } from './jobs.js';
import {
  enode,
  getEnodeVehicles,
  getVehicleSettings,
  saveVehicle,
} from './services.js';

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

const api = createRouter();
app.use('/api', api.getRouter());

api.post('/setup', {}, auth.isAuthorized(), async () => {
  const user = auth.useCurrentUser()!;
  logger.info('setup initiated', { user });
  const link = await enode.users.link(user.id);

  await postSlackMessageJob.delay({
    message: `User ${user.id} initiated a vehicle setup`,
  });

  return {
    url: link.linkUrl,
  };
});

api.get('/vehicles', {}, auth.isAuthorized(), async () => {
  const user = auth.useCurrentUser()!;
  const linkedVehicles = await getEnodeVehicles(user.id);
  const settingsByVehicleId = await getVehicleSettings(
    linkedVehicles.data.map((v) => v.id),
  );

  const displayName = (v: VehicleRecord) => {
    return (
      v.information.displayName ||
      `${v.information.brand} ${v.information.model}`
    );
  };

  return linkedVehicles.data.map((v) => ({
    id: v.id,
    vin: v.information.vin,
    name: displayName(v),
    year: v.information.year,
    batteryLevel: v.chargeState.batteryLevel,
    isCharging: v.chargeState.isCharging,
    chargingLastUpdated: v.chargeState.lastUpdated,
    odometerDistance: v.odometer.distance,
    odometerLastUpdated: v.odometer.lastUpdated,
    desiredMaxCharge: Number(settingsByVehicleId[v.id]?.['maxCharge'] || '75'),
    isActive: settingsByVehicleId[v.id]?.['isActive'] || false,
  }));
});

const chargeInput = type({
  maxCharge: '0<=number<=100',
  isActive: 'boolean',
});

api.put(
  '/charges/:vehicleId',
  { request: chargeInput },
  auth.isAuthorized(),
  async (req) => {
    const user = auth.useCurrentUser()!;
    const vehicleId = req.params.vehicleId;
    const { maxCharge, isActive } = req.body;
    const payload = { maxCharge, isActive };

    await postgres.transaction(async () => {
      await saveVehicle(user.id, vehicleId, payload);
    });

    await postSlackMessageJob.delay({
      message: `User ${user.id} updated vehicle ${vehicleId} to ${JSON.stringify(
        payload,
      )}`,
    });

    return payload;
  },
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
