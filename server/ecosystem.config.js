module.exports = {
  apps: [{
    name: 'tourbnt-server',
    // Explicit cwd — PM2 does NOT default this to the ecosystem file's own
    // directory when started as `pm2 start server/ecosystem.config.js` from
    // a parent directory (as the deploy script does); without this, every
    // relative path below (script, log files) resolves against whatever
    // directory PM2 happened to be invoked from instead.
    cwd: __dirname,
    script: './dist/server.js',
    instances: 1,  // Run 1 instances
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 8000,
      // This VM has no IPv6 route, and Neon's hostname resolves to IPv6
      // first, so force IPv4 to avoid wasting time on unreachable attempts.
      // (Investigated as a cause of a separate hang on /api/v1/tours and
      // /api/v1/global/categories — it wasn't; that hang reproduces with
      // this flag on too, so it's something else. Keeping this anyway,
      // it's still the right default given the VM's actual network.)
      NODE_OPTIONS: '--dns-result-order=ipv4first'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '500M',
    autorestart: true,
    watch: false,
    max_restarts: 10,
    min_uptime: '10s',
    listen_timeout: 10000,
    kill_timeout: 5000
  }]
};
