// This file configures the initialization of Sentry on the client side.

import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN_FRONTEND;
const environment = process.env.NEXT_PUBLIC_ENVIRONMENT || "production";

Sentry.init({
  dsn: SENTRY_DSN,
  
  // Environment and release tracking
  environment: environment,
  release: process.env.NEXT_PUBLIC_APP_VERSION,
  
  // Performance Monitoring
  tracesSampleRate: environment === "production" ? 0.1 : 1.0,
  
  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  
  // Error filtering
  beforeSend(event, hint) {
    // Filter out certain errors
    if (event.exception) {
      const error = hint.originalException;
      
      // Don't send network errors in development
      if (environment === "development" && (error as any)?.message?.includes("NetworkError")) {
        return null;
      }
      
      // Filter out specific errors
      if ((error as any)?.message?.includes("ResizeObserver loop limit exceeded")) {
        return null;
      }
    }
    
    return event;
  },
  
  // Integrations
  integrations: (() => {
    const integrations: any[] = [];
    try {
      integrations.push(new (Sentry as any).BrowserTracing({
        tracingOrigins: ["localhost", process.env.NEXT_PUBLIC_API_URL || "/", /^\//],
        routingInstrumentation: (Sentry as any).nextRouterInstrumentation,
      }));
    } catch (_) {}
    try {
      integrations.push(new (Sentry as any).Replay({
        maskAllText: false,
        maskAllInputs: true,
        blockSelector: ".sensitive-data",
      }));
    } catch (_) {}
    return integrations;
  })(),
  
  // Additional options
  ignoreErrors: [
    // Browser extensions
    "top.GLOBALS",
    // Random plugins/extensions
    "originalCreateNotification",
    "canvas.contentDocument",
    "MyApp_RemoveAllHighlights",
    // Facebook related errors
    "fb_xd_fragment",
    // IE specific errors
    "Non-Error promise rejection captured",
  ],
});