import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import './index.css';

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element #root not found');

// Sentry — only activates if VITE_SENTRY_DSN is set; warns and skips otherwise.
const dsn = import.meta.env.VITE_SENTRY_DSN;
if (dsn) {
  import('@sentry/react')
    .then(({ init, browserTracingIntegration }) => {
      init({
        dsn,
        integrations: [browserTracingIntegration()],
        tracesSampleRate: 1.0,
      });
    })
    .catch((err) => {
      console.warn('[sentry] init failed, skipping:', err);
    });
} else {
  console.info('[sentry] VITE_SENTRY_DSN not set — error tracking disabled');
}

createRoot(rootEl).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
