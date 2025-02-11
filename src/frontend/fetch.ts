import { createFetch } from '@devmoods/fetch';

export const fetch = createFetch({
  headers: {
    Accept: 'application/json',
    'X-CSRF-Token': (() => {
      try {
        return (
          document
            .querySelector('meta[name="csrf-token"]')
            ?.getAttribute('content') ?? ''
        );
      } catch {
        return '';
      }
    })(),
  },
  timeout: 20000,
  getRootUrl: import.meta.env.SSR
    ? () => `${process.env.PUBLIC_URL!}/api`
    : () => '/api',
});
