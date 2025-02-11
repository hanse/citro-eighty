import {
  getLogger,
  registerDefaultCommands,
  registerManagementCommand,
  runManagementCommands,
} from '@devmoods/express-extras';

import { redis } from './api/config.js';
import { app } from './api/index.js';
import { killChargingJob } from './api/jobs.js';
import { getVehicleSettings } from './api/services.js';

registerDefaultCommands(app);

await redis.connect();

const logger = getLogger();

registerManagementCommand((command) => {
  command('trigger-sync').action(async () => {
    const vehicleIds = (await redis.sMembers('vehicles')) as string[];
    const vehicleSettings = await getVehicleSettings(vehicleIds);

    logger.info(
      `Killing charging for ${Object.keys(vehicleSettings).length} vehicles`,
    );

    for (const [vehicleId, settings] of Object.entries(vehicleSettings)) {
      if (!settings.chargeKillerEnabled) {
        logger.info('Vehicle not enabled', { vehicleId });
        continue;
      }

      await killChargingJob.delay({
        vehicleId,
        maxCharge: settings.maxCharge,
      });
    }
  });
});

await runManagementCommands();
await redis.quit();
