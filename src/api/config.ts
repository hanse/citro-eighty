import {
  createCache,
  createEmail,
  createJobs,
  createPostgres,
  createRedis,
  createRedisCacheAdapter,
  createSlack,
} from '@devmoods/express-extras';

export const postgres = createPostgres();
export const redis: ReturnType<typeof createRedis> = createRedis();
export const email = createEmail();
export const cache = createCache(createRedisCacheAdapter(redis));
export const jobs = createJobs({ queues: ['citro80'] });
export const slack = createSlack();
