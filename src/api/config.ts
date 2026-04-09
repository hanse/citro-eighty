import {
  createCache,
  createEmail,
  createJobs,
  createPostgres,
  createRedis,
  createRedisCacheAdapter,
  createSlack,
} from '@devmoods/express-extras';

export const postgres: ReturnType<typeof createPostgres> = createPostgres();
export const redis: ReturnType<typeof createRedis> = createRedis();
export const email: ReturnType<typeof createEmail> = createEmail();
export const cache: ReturnType<typeof createCache> = createCache(
  createRedisCacheAdapter(redis),
);
export const jobs: ReturnType<typeof createJobs> = createJobs({
  queues: ['citro80'],
});
export const slack: ReturnType<typeof createSlack> = createSlack();
