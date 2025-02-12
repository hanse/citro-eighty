import {
  createCache,
  createEmail,
  createJobs,
  createPostgres,
  createRedis,
  createRedisCacheAdapter,
  createSlack,
  extendConfig,
  readEnv,
} from '@devmoods/express-extras';

export const config = extendConfig({
  ENODE_CLIENT_ID: readEnv('ENODE_CLIENT_ID', ''),
  ENODE_CLIENT_SECRET: readEnv('ENODE_CLIENT_SECRET', ''),
  ENODE_API_URL: readEnv('ENODE_API_URL', ''),
  ENODE_OAUTH_URL: readEnv('ENODE_OAUTH_URL', ''),
});

export const postgres = createPostgres();
export const redis = createRedis();
export const email = createEmail();
export const cache = createCache(createRedisCacheAdapter(redis));
export const jobs = createJobs({ queueName: 'citro80' });
export const slack = createSlack();
