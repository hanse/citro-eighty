import {
  createCache,
  createEmail,
  createJobs,
  createPostgres,
  createRedis,
  createRedisCacheAdapter,
  createSlack,
  extendConfig,
} from '@devmoods/express-extras';

export const config = extendConfig({});

export const postgres = createPostgres();
export const redis = createRedis();
export const email = createEmail();
export const cache = createCache(createRedisCacheAdapter(redis));
export const jobs = createJobs({ queueName: 'citro80' });
export const slack = createSlack();
