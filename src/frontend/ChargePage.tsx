import {
  Alert,
  Badge,
  Button,
  CircularProgress,
  cx,
  Panel,
  Slider,
  Spacer,
  Stack,
  Tooltip,
  useMutation,
  useQuery,
  useSliderState,
  useToast,
} from '@devmoods/ui';
import { type ReactNode } from 'react';

import { MagicLinkLoginForm, useCurrentUser } from './Auth.js';
import { fetch } from './fetch.js';

interface Vehicle {
  id: string;
  name: string;
  year: number;
  vin: string;
  batteryLevel: number;
  isCharging: boolean;
  desiredMaxCharge: number;
  isActive: boolean;
  chargingLastUpdated: string;
  odometerDistance: number;
  odometerLastUpdated: string;
}

export function ChargePage() {
  const currentUser = useCurrentUser();

  if (!currentUser) {
    return (
      <div>
        <p className="dmk-text-title1 dmk-text-semibold">
          Stop charging at 80% 🔋
        </p>
        <p className="dmk-margin-top-l">
          Sign up now to connect your Citroën EV and automatically stop charging
          when you've had enough.
        </p>

        <div className="dmk-margin-top-m">
          <MagicLinkLoginForm />
        </div>

        <p className="dmk-margin-top-m dmk-text-muted">
          The vehicle connection is handled by{' '}
          <a href="https://enode.com">Enode</a> and is very safe.
        </p>
      </div>
    );
  }

  return <VehiclesList />;
}

function VehiclesList() {
  const { data, loading, refetch } = useQuery(
    (signal) =>
      fetch<Vehicle[]>('/vehicles', { signal }).then((r) => r.jsonData!),
    [],
  );

  if (loading && !data) {
    return (
      <Stack alignItems="center">
        <CircularProgress />
      </Stack>
    );
  }

  const vehicles = data || [];

  return (
    <Stack style={{ height: '100%' }}>
      {vehicles.length === 0 && (
        <>
          <Stack horizontal alignItems="center" justifyContent="space-between">
            <h2 className="dmk-text-title1 dmk-text-600">
              Your vehicle <span className="dmk-text-muted">&ndash;</span>
            </h2>
            <div>
              <CircularProgress value={75} thickness={6} size={72} />
            </div>
          </Stack>
          <Panel>
            Connect your Citroën EV to the app now to configure your charger to
            stop at 80%.
          </Panel>
        </>
      )}
      <Stack style={{ height: '100%' }}>
        {vehicles.map((vehicle) => (
          <VehicleCard key={vehicle.id} vehicle={vehicle} onSubmit={refetch} />
        ))}
      </Stack>
      <div className="dmk-margin-top-m">
        <LinkVehicleButton>
          {vehicles.length === 0 ? 'Connect vehicle' : 'Link new vehicle'}
        </LinkVehicleButton>
      </div>
      <p className="dmk-text-muted dmk-text-caption2">Use at your own risk.</p>
    </Stack>
  );
}

function VehicleCard({
  vehicle,
  onSubmit,
}: {
  vehicle: Vehicle;
  onSubmit: () => void;
}) {
  const updateChargingMutation = useMutation(
    async ({
      maxCharge,
      isActive,
    }: {
      maxCharge: number;
      isActive: boolean;
    }) => {
      return fetch(`/charges/${vehicle.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          maxCharge,
          isActive,
        }),
      });
    },
  );

  const toast = useToast();

  const maxCharge = useSliderState(vehicle.desiredMaxCharge);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    try {
      await updateChargingMutation.mutate({
        maxCharge: maxCharge.value,
        isActive: true,
      });

      onSubmit();

      toast({
        title: 'Max charge updated',
        description: `The vehicle will stop charging at ${maxCharge.value}%`,
        duration: 2000,
      });
    } catch {
      toast({
        title: 'Failed to set max charge',
        description: 'An error occured',
        intent: 'error',
      });
    }
  };

  const handleCancel = async () => {
    await updateChargingMutation.mutate({
      maxCharge: maxCharge.value,
      isActive: false,
    });

    onSubmit();
  };

  const disabled = !vehicle.isCharging;

  return (
    <Stack as="form" onSubmit={handleSubmit} spacing="l">
      <Stack horizontal alignItems="center" justifyContent="space-between">
        <div>
          <h2 className="dmk-text-title1 dmk-text-600">
            {vehicle.name}
            <br />
            {vehicle.isCharging ? (
              <Badge intent="success">🔋 Charging</Badge>
            ) : (
              <Badge>Not charging</Badge>
            )}
          </h2>
          <Tooltip
            title={`Odometer last updated ${vehicle.odometerLastUpdated}.`}
          >
            <span className="dmk-text-muted dmk-text-footnote">
              {vehicle.year} &middot; {vehicle.odometerDistance} km &middot;{' '}
              {new Date(vehicle.chargingLastUpdated).toLocaleTimeString()}
            </span>
          </Tooltip>
        </div>
        <div className={cx(vehicle.isCharging && 'dmk-animate-pulse')}>
          <CircularProgress
            value={vehicle.batteryLevel}
            color={
              vehicle.batteryLevel > 40
                ? 'var(--colors-secondary)'
                : 'var(--colors-red-60)'
            }
            thickness={6}
            size={72}
          >
            <span style={{ fontSize: 20, fontWeight: 600 }}>
              {vehicle.batteryLevel}%
            </span>
          </CircularProgress>
        </div>
      </Stack>
      <Spacer height={24} />
      {disabled && (
        <Alert title="Not charging" intent="warning">
          Plug in and start charging to set a max limit.
        </Alert>
      )}

      <Stack>
        <Stack horizontal>
          <Slider min={0} max={100} {...maxCharge} disabled={disabled} />
          <strong className="dmk-text-title2">{maxCharge.value}%</strong>
        </Stack>
        <Button type="submit" disabled={disabled} className="dmk-margin-top-l">
          {!vehicle.isCharging
            ? 'Not charging'
            : vehicle.isActive
              ? 'Update max charge'
              : 'Set max charge'}
        </Button>
        {vehicle.isActive && (
          <Button variant="outlined" intent="danger" onClick={handleCancel}>
            Cancel
          </Button>
        )}
      </Stack>
    </Stack>
  );
}

function LinkVehicleButton({ children }: { children: ReactNode }) {
  const mutation = useMutation(async () => {
    const response = await fetch<{ url: string }>('/setup', { method: 'POST' });
    window.location.href = response.jsonData!.url;
  });

  return (
    <Button
      onClick={() => mutation.mutate({})}
      isPending={mutation.isPending}
      variant="outlined"
    >
      {children}
    </Button>
  );
}
