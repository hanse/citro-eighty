import 'dotenv/config';

import { getLogger, sql } from '@devmoods/express-extras';

import { cache, config, postgres } from './config.js';
import {
  Enode,
  type VehicleActionResponse,
  type VehicleRecord,
} from './enode.js';
import { type DB } from '../types/db.gen.js';

const logger = getLogger();

export const enode = new Enode({
  clientId: config.value.ENODE_CLIENT_ID,
  clientSecret: config.value.ENODE_CLIENT_SECRET,
  apiUrl: config.value.ENODE_API_URL,
  oauthUrl: config.value.ENODE_OAUTH_URL,
});

export class ActionDoneError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export async function killCharging(vehicleId: string) {
  const vehicle = await postgres.get<
    Pick<DB['vehicles'], 'max_charge' | 'user_id' | 'action_id'>
  >(sql`
    SELECT max_charge, user_id, action_id
    FROM vehicles
    WHERE external_id = ${vehicleId}
  `);

  await getEnodeVehicles.clear(vehicle.user_id);

  const enodeVehicle = await enode.vehicles.get(vehicleId);

  if (!isChargeLevelAbove(enodeVehicle, vehicle.max_charge)) {
    logger.info('Charging not finished yet', {
      vehicleId,
      maxCharge: vehicle.max_charge,
      chargeState: enodeVehicle.chargeState,
    });
    return;
  }

  const action = await sendStopAction(enodeVehicle, vehicle.action_id);

  logger.info('Sending STOP action', {
    vehicleId,
    action,
  });

  await postgres.transaction(async () => {
    await postgres.query(
      sql`UPDATE vehicles SET action_id = ${action.id}, updated_at = ${new Date()} WHERE external_id = ${vehicleId}`,
    );

    if (action.state === 'CONFIRMED') {
      logger.info('Charging is finished, deactivating', {
        vehicleId,
      });
      await deactivateVehicle(vehicleId);
    }

    await getEnodeVehicles.clear(vehicle.user_id);
  });
}

export function isChargeLevelAbove(
  vehicle: VehicleRecord,
  desiredBatteryLevel: number,
) {
  const chargeState = vehicle.chargeState;

  if (chargeState.isFullyCharged) {
    return true;
  }

  if (chargeState.batteryLevel == null) {
    return false;
  }

  return chargeState.batteryLevel >= desiredBatteryLevel;
}

export async function sendStopAction(
  vehicle: VehicleRecord,
  actionId: string | null,
): Promise<VehicleActionResponse> {
  if (actionId) {
    const action = await enode.vehicles.getAction(actionId);
    if (action.state !== 'FAILED' && action.state !== 'CANCELLED') {
      return action;
    }
  }

  return enode.vehicles.charge(vehicle.id, {
    action: 'STOP',
  });
}

export async function getVehicleSettings(vehicleIds?: string[]) {
  const query = sql`SELECT external_id, max_charge, is_active FROM vehicles`;

  if (vehicleIds != null) {
    query.append(sql` WHERE external_id = ANY(${vehicleIds})`);
  }

  const vehicles =
    await postgres.all<
      Pick<DB['vehicles'], 'external_id' | 'max_charge' | 'is_active'>
    >(query);

  return Object.fromEntries(
    vehicles.map((vehicle) => [
      vehicle.external_id,
      { maxCharge: vehicle.max_charge, isActive: vehicle.is_active },
    ]),
  );
}

interface VehicleSettings {
  maxCharge: number;
  isActive: boolean;
}

export async function saveVehicle(
  userId: string,
  vehicleId: string,
  settings: Partial<VehicleSettings>,
) {
  await postgres.query(
    sql`SELECT * FROM vehicles WHERE external_id = ${vehicleId} FOR UPDATE`,
  );

  const updates: Partial<DB['vehicles']> = {
    user_id: userId,
    max_charge: settings.maxCharge,
    is_active: settings.isActive,
    updated_at: new Date(),
  };

  await postgres.query(sql`
    INSERT INTO vehicles ${sql.spreadInsert({
      external_id: vehicleId,
      ...updates,
    })}
    ON CONFLICT (external_id) DO UPDATE
    SET ${sql.spreadUpdate(updates)}
  `);
}

export async function deactivateVehicle(vehicleId: string) {
  await postgres.query(sql`
    UPDATE vehicles
    SET action_id = NULL, is_active = FALSE, updated_at = ${new Date()}
    WHERE external_id = ${vehicleId}
  `);
}

export const getEnodeVehicles = cache.decorate(
  { expiresMs: 60 * 1000 },
  (userId: string) => enode.vehicles.listByUser(userId),
);
