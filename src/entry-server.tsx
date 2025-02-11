import { type SsrRenderOptions } from '@devmoods/express-extras/vite/types';
import { renderToString } from 'react-dom/server';
import {
  StaticRouterProvider,
  createStaticHandler,
  createStaticRouter,
} from 'react-router';

import { AuthProvider } from './frontend/Auth.js';
import { Root, routes } from './frontend/Root.js';

export async function render(req: Request, options: SsrRenderOptions) {
  const { query } = createStaticHandler(routes);
  const context = await query(req);

  if (context instanceof Response) {
    throw context;
  }

  const router = createStaticRouter(routes, context);

  const helmetContext: Record<string, any> = {};

  const initialData = await options.getInitialData(req);

  const currentUser = (initialData as any).user;

  const html = renderToString(
    <html lang="en">
      <head>
        {options.useDevServer && (
          <script type="module" nonce={options.nonce}>
            {options.preamble}
          </script>
        )}
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <meta name="theme-color" content="#FFFFFF" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Citro 80." />

        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;900&amp;display=block"
          rel="stylesheet"
        />

        {options.placeholders}

        <meta name="csrf-token" content={options.csrfToken} />
      </head>
      <body>
        <div id="root">
          <Root helmetContext={helmetContext}>
            <AuthProvider currentUser={currentUser}>
              <StaticRouterProvider
                router={router}
                context={context}
                nonce={options.nonce}
              />
            </AuthProvider>
          </Root>
        </div>
        {options.useDevServer && (
          <script type="module" src="/src/entry-client.tsx" />
        )}
        <script
          defer
          data-domain={options.publicUrl.hostname}
          src="/analytics.js"
        />
        <script nonce={options.nonce}>
          {`window.store = ${JSON.stringify(initialData)};`}
        </script>
      </body>
    </html>,
  );

  return {
    html,
    context: helmetContext.helmet,
  };
}
