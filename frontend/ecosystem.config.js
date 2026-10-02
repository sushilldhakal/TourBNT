// require.resolve walks up from this file's directory, so it finds Next's
// CLI entry point whether npm's workspace install hoisted it to the repo
// root's node_modules or kept it local to frontend/ — a hardcoded relative
// path would silently break depending on which one npm chose. PM2 cluster
// mode also needs this to be a real .js file it loads directly (not a
// `npm`/`npx` wrapper process), or the 2 instances would each try to bind
// port 3000 themselves instead of load-balancing across one.
const nextBin = require.resolve('next/dist/bin/next');

module.exports = {
  apps: [{
    name: 'tourbnt-frontend',
    // Explicit cwd — without it, `next start` runs from whatever directory
    // PM2 was invoked from (not this file's directory), so it can't find
    // its own .next build output and crash-loops on startup.
    cwd: __dirname,
    // Runs the standard Next.js production server against the regular
    // `next build` output (this app's .next directory, not a standalone
    // bundle).
    script: nextBin,
    args: 'start -p 3000 -H 0.0.0.0',
    instances: 2,  // Run 2 instances for load balancing
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOSTNAME: '0.0.0.0',
      // Server-side calls to the API (SSR, the /api proxy route) stay on this machine instead of
      // looping out through https://tourbnt.com. Must match the API's port in server/ecosystem.config.js.
      BACKEND_INTERNAL_URL: 'http://127.0.0.1:8000'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    autorestart: true,
    watch: false,
    max_restarts: 10,
    min_uptime: '10s',
    listen_timeout: 10000,
    kill_timeout: 5000
  }]
};
