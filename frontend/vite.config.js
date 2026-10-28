import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.DEV_GATEWAY_URL || 'http://127.0.0.1:8080';
  return { server: { port: 5173, strictPort: true, proxy: {
    '/api': { target }, '/services': { target },
  } } };
});
