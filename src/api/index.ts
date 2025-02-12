import * as crypto from 'node:crypto';

import {
  before,
  createAuth,
  createExpressServer,
  DoesNotExistError,
  errorHandler,
  getLogger,
  notFound,
  PasswordlessAuthProvider,
  RedisTokenStorage,
  route,
  validateBody,
} from '@devmoods/express-extras';
import { createSsrMiddleware } from '@devmoods/express-extras/vite/ssr';
import express from 'express';

import { cache, config, postgres, redis } from './config.js';
import { sendEmailJob } from './jobs.js';
import {
  enode,
  getVehicleSettings,
  updateVehicleSettings,
} from './services.js';

export const app = express();

const logger = getLogger();

const sha256 = (input: string) =>
  crypto.createHash('sha256').update(input).digest('hex');

type User = Awaited<ReturnType<typeof getUserByEmail>>;

const filterUser = (u: User) => u;

async function getUserByEmail(email: string) {
  const userId = sha256(email);
  return {
    id: userId,
    email,
  };
}

export const auth = createAuth({
  tokenStorage: new RedisTokenStorage(redis),
  getUserById: async (id) => {
    const email = await redis.get(`user:${id}`);
    if (!email) {
      throw new DoesNotExistError('User does not exist');
    }
    return getUserByEmail(email);
  },
  filterUser,
  providers: [
    PasswordlessAuthProvider({
      getUserByEmail: async (email) => {
        const id = sha256(email);
        return { id, email } as User;
      },
      onLoginRequest: async (user, temporaryToken) => {
        await redis.set(`user:${user.id}`, user.email);
        await sendEmailJob.delay({
          to: user.email,
          subject: 'Your login to Citro 80.',
          message: passwordlessLoginTemplate(user, temporaryToken),
        });
      },
    }),
  ],
});

function passwordlessLoginTemplate(user: User, temporaryToken: string) {
  return `
Hi!

Use this link to login to Citro 80:

${config.value.PUBLIC_URL}/auth/magic-link/${temporaryToken}

The link will expire in 1 hour.
  `;
}

app.set('trust proxy', true);

app.use(before({ csrf: true }));
app.use(auth.before());

app.use('/api/auth', auth.createRouter());

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
    const settingsByVehicleId = await getVehicleSettings(
      linkedVehicles.data.map((v) => v.id),
    );

    return linkedVehicles.data.map((v) => ({
      id: v.id,
      name: v.information.displayName,
      batteryLevel: v.chargeState.batteryLevel,
      isCharging: v.chargeState.isCharging,
      desiredMaxCharge: Number(settingsByVehicleId[v.id]['maxCharge'] || '75'),
      chargeKillerEnabled:
        settingsByVehicleId[v.id]['chargeKillerEnabled'] || false,
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
      chargeKillerEnabled: { type: 'boolean' },
    },
  }),
  route(async (req) => {
    const vehicleId = req.params.vehicleId;
    const maxCharge = req.body.maxCharge;
    const chargeKillerEnabled = req.body.chargeKillerEnabled;
    const payload = { maxCharge, chargeKillerEnabled };
    await updateVehicleSettings(vehicleId, payload);
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
