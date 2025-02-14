/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SENTRY_DSN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  readonly store: {
    user:
      | {
          id: string;
          email: string;
          linkedVehicles: {
            id: string;
            name: string;
            batteryLevel: number;
            isCharging: boolean;
            desiredMaxCharge: number;
            isActive: boolean;
          }[];
        }
      | undefined;
  };
}
