import { setGlobalLoggerContext } from '@devmoods/express-extras';

import { auth } from './api/auth.js';
import { createServer } from './api/index.js';

setGlobalLoggerContext(() => {
  const user = auth.useCurrentUser();
  return {
    currentUser: user == null ? null : `${user.id}`,
  };
});

const server = await createServer();
await server.start();
