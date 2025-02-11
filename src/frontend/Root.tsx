import '@devmoods/ui/global.css';
import '@devmoods/ui/styles.css';

import './index.css';

import {
  ErrorBoundary,
  Panel,
  Stack,
  ThemeProvider,
  ToastProvider,
  createTheme,
} from '@devmoods/ui';
import { type ReactNode, StrictMode } from 'react';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { Outlet, useRouteError, type RouteObject } from 'react-router';

import { SignedOut, VerifyMagicLink } from './Auth.jsx';
import { ChargePage } from './ChargePage.jsx';

const theme = createTheme({
  fonts: {
    base: 'DM Sans',
  },
  colors: {
    primary: '#082f49',
    formsBorderRadius: '4px',
  },
  focusRing: {
    color: '#e6a51a',
    width: '2px',
  },
});

function ErrorElement() {
  const error: any = useRouteError();
  return (
    <Stack
      alignItems="center"
      justifyContent="center"
      style={{ height: '100vh', width: '100vw' }}
    >
      <Panel style={{ maxWidth: 500, margin: '0 auto' }}>
        <span className="dmk-text-headline">Internal error ❌</span>
        <p className="dmk-margin-top-s">Something went wrong</p>

        <pre className="dmk-margin-top-l" style={{ overflow: 'scroll' }}>
          {error.message}
        </pre>
      </Panel>
    </Stack>
  );
}

function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="App">
      <header className="App-header">
        <span className="logo">Citro 80.</span>
      </header>
      {children}
    </div>
  );
}

function AuthRoot() {
  return (
    <AppLayout>
      <Helmet title="Auth" />
      <SignedOut redirectSignedInTo="/">
        <div className="dmk-margin-top-l">
          <Outlet />
        </div>
      </SignedOut>
    </AppLayout>
  );
}

function ChargeRoot() {
  return (
    <AppLayout>
      <Helmet title="Home" />
      <ChargePage />
    </AppLayout>
  );
}

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <ChargeRoot />,
    errorElement: <ErrorElement />,
  },
  {
    path: '/auth',
    element: <AuthRoot />,
    errorElement: <ErrorElement />,
    children: [
      {
        path: 'magic-link/:token',
        element: <VerifyMagicLink />,
      },
    ],
  },
];

interface RootProps {
  helmetContext?: Record<string, any>;
  children: ReactNode;
}

export function Root({ children, helmetContext }: RootProps) {
  return (
    <StrictMode>
      <HelmetProvider context={helmetContext}>
        <ErrorBoundary>
          <Helmet titleTemplate="%s - Citro 80." />
          <ThemeProvider theme={theme}>
            <ToastProvider>{children}</ToastProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </HelmetProvider>
    </StrictMode>
  );
}
