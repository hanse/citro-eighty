import { setGlobalLoggerContext } from '@devmoods/express-extras';

import { createServer, auth } from './api/index.js';

setGlobalLoggerContext(() => {
  const user = auth.useCurrentUser();
  return {
    currentUser: user == null ? null : `${user.id}`,
  };
});

const server = await createServer();
await server.start();
