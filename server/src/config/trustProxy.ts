/**
 * Which hops Express believes when it reads X-Forwarded-For, so `req.ip` is the real visitor.
 *
 * Production path: visitor -> Cloudflare -> nginx (same machine) -> Express. Without this, Express
 * saw only nginx (127.0.0.1) for everybody, so every visitor shared ONE rate-limit bucket and the ad
 * view/click de-duplication keyed on a single address.
 *
 * Only loopback (nginx) and Cloudflare's published ranges are trusted — not "any number of hops" —
 * so a request that reaches the server directly, skipping Cloudflare, cannot claim an address by
 * sending its own X-Forwarded-For. Ranges: https://www.cloudflare.com/ips (rarely change).
 */
export const CLOUDFLARE_RANGES = [
  '173.245.48.0/20', '103.21.244.0/22', '103.22.200.0/22', '103.31.4.0/22', '141.101.64.0/18', '108.162.192.0/18',
  '190.93.240.0/20', '188.114.96.0/20', '197.234.240.0/22', '198.41.128.0/17', '162.158.0.0/15', '104.16.0.0/13',
  '104.24.0.0/14', '172.64.0.0/13', '131.0.72.0/22',
  '2400:cb00::/32', '2606:4700::/32', '2803:f800::/32', '2405:b500::/32', '2405:8100::/32', '2a06:98c0::/29', '2c0f:f248::/32',
];

export const TRUST_PROXY: string[] = ['loopback', ...CLOUDFLARE_RANGES];
