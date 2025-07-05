import { NextResponse } from 'next/server';

export async function GET() {
  const health = {
    status: 'healthy',
    service: 'logicarena-frontend',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
    checks: {
      api: {
        status: 'unknown',
        url: process.env.NEXT_PUBLIC_API_URL
      } as any
    }
  };

  // Check API connectivity if URL is configured
  if (process.env.NEXT_PUBLIC_API_URL) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/health`, {
        signal: controller.signal,
        cache: 'no-store'
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        health.checks.api.status = 'healthy';
      } else {
        health.checks.api.status = 'unhealthy';
        health.checks.api.statusCode = response.status;
        health.status = 'degraded';
      }
    } catch (error) {
      health.checks.api.status = 'unhealthy';
      health.checks.api.error = error instanceof Error ? error.message : 'Unknown error';
      health.status = 'degraded';
    }
  }

  const statusCode = health.status === 'healthy' ? 200 : 503;
  
  return NextResponse.json(health, { status: statusCode });
}