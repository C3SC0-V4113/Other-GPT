import createNextIntlPlugin from 'next-intl/plugin';

import type { NextConfig } from 'next';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  /* config options here */
  allowedDevOrigins: ['http://localhost:3000', '192.168.1.6'],
};

export default withNextIntl(nextConfig);
