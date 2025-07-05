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
  integrations: [
    // Browser tracing
    new Sentry.BrowserTracing({
      // Set sampling rate for performance monitoring
      tracingOrigins: ["localhost", process.env.NEXT_PUBLIC_API_URL || "/", /^\//],
      
      // Capture interactions
      routingInstrumentation: Sentry.nextRouterInstrumentation,
    }),
    
    // Replay integration
    new Sentry.Replay({
      // Mask sensitive content
      maskAllText: false,
      maskAllInputs: true,
      
      // Block certain elements
      blockSelector: ".sensitive-data",
    }),
  ],
  
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