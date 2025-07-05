#!/usr/bin/env node

// Health check script for Docker health checks
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5003,
  path: '/health',
  method: 'GET',
  timeout: 5000
};

const req = http.request(options, (res) => {
  if (res.statusCode === 200) {
    process.exit(0); // Healthy
  } else {
    process.exit(1); // Unhealthy
  }
});

req.on('error', (e) => {
  console.error(`Health check failed: ${e.message}`);
  process.exit(1); // Unhealthy
});

req.on('timeout', () => {
  req.destroy();
  console.error('Health check timed out');
  process.exit(1); // Unhealthy
});

req.end();