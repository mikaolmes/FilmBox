// next.config.mjs

const config = {
  // Your Next.js configuration
  webpack: (config, { isServer }) => {
    // Add support for WebSockets
    if (!isServer) {
      config.externals = [...(config.externals || []), { 'bufferutil': 'bufferutil', 'utf-8-validate': 'utf-8-validate' }];
    }
    return config;
  },
  // Add rewrites to handle Socket.IO requests
  async rewrites() {
    return [
      {
        source: '/socket.io/:path*',
        destination: '/api/socket',
      },
    ];
  },
};

export default config;