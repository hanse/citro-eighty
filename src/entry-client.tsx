// eslint-disable-next-line import/order
import 'vite/modulepreload-polyfill';

// eslint-disable-next-line import/order
import { hydrateRoot } from 'react-dom/client';

import { createBrowserRouter, RouterProvider } from 'react-router';

import { AuthProvider } from './frontend/Auth.js';
import { Root, routes } from './frontend/Root.js';

if (typeof (window as any).global === 'undefined') {
  (window as any).global = window;
}

const router = createBrowserRouter(routes);

hydrateRoot(
  document.getElementById('root') as HTMLElement,
  <Root>
    <AuthProvider currentUser={window.store.user}>
      <RouterProvider router={router} />
    </AuthProvider>
  </Root>,
);
