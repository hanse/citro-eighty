import {
  getLogger,
  registerDefaultCommands,
  registerManagementCommand,
  runManagementCommands,
  sql,
} from '@devmoods/express-extras';

import { postgres } from './api/config.js';
import { app } from './api/index.js';
import { killChargingJob } from './api/jobs.js';
import { type DB } from './types/db.gen.js';

registerDefaultCommands(app);

const logger = getLogger();

registerManagementCommand((command) => {
  command('trigger-sync').action(async () => {
    await postgres.withConnection(async (tx) => {
      const vehicles = await tx.all<Pick<DB['vehicles'], 'external_id'>>(
        sql`SELECT external_id FROM vehicles WHERE is_active = TRUE`,
      );

      logger.info(`Killing charging for ${vehicles.length} vehicles`);

      for (const vehicle of vehicles) {
        await killChargingJob.delay({
          vehicleId: vehicle.external_id,
        });
      }
    });
  });
});

await runManagementCommands();
await postgres.end();
