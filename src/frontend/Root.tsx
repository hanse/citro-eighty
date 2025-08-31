import '@devmoods/ui/global.css';
import '@devmoods/ui/styles.css';

import './index.css';

import {
  ErrorBoundary,
  Panel,
  ResponsiveMobileAppHeader,
  ResponsiveMobileAppLayout,
  Stack,
  ThemeProvider,
  ToastProvider,
  createTheme,
} from '@devmoods/ui';
import { type ReactNode, StrictMode } from 'react';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { NavLink, Outlet, useRouteError, type RouteObject } from 'react-router';

import { MagicLinkOtp, SignedOut, VerifyMagicLink } from './Auth.jsx';
import { ChargePage } from './ChargePage.jsx';
import { FaqPage } from './FaqPage.jsx';

const theme = createTheme({
  fonts: {
    base: 'DM Sans',
  },
  colors: {
    base: '#ffffff',
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
    <ResponsiveMobileAppLayout
      maxWidth="640px"
      header={
        <ResponsiveMobileAppHeader
          title={
            <NavLink to="/" className="logo">
              Citro 80<span style={{ color: '#99BA09' }}>.</span>
            </NavLink>
          }
        >
          <NavLink to="/faq">FAQ</NavLink>
        </ResponsiveMobileAppHeader>
      }
    >
      {children}
    </ResponsiveMobileAppLayout>
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
      <Outlet />
    </AppLayout>
  );
}

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <ChargeRoot />,
    errorElement: <ErrorElement />,
    children: [
      { path: 'faq', element: <FaqPage /> },
      { path: 'otp', element: <MagicLinkOtp /> },
      { index: true, element: <ChargePage /> },
    ],
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
