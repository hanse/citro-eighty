import 'dotenv/config';

import { define, t, loadConfig } from '@devmoods/config';
import { config } from '@devmoods/express-extras/config';

declare module '@devmoods/config' {
  interface Config extends ConfigFromDefs<typeof appConfig> {}
}

const appConfig = define({
  ...config,
  ENODE_CLIENT_ID: t.string(),
  ENODE_CLIENT_SECRET: t.string(),
  ENODE_API_URL: t.string(),
  ENODE_OAUTH_URL: t.string(),
  ENODE_LINK_REDIRECT_URI: t.string(),
});

loadConfig(appConfig);
