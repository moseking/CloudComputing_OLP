import { defineConfig, loadEnv } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.DEV_GATEWAY_URL || 'http://127.0.0.1:8080';
  return {
    plugins: [tailwindcss()],
    server: {
      port: 5173,
      strictPort: true,
      proxy: { '/api': { target }, '/services': { target } },
    },
    preview: {
      port: 4173,
      strictPort: true,
      proxy: { '/api': { target }, '/services': { target } },
    },
  };
});
