import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    // This is crucial for GitHub Pages. It ensures assets are loaded relative to the index.html
    base: './', 
    define: {
      // Polyfill process.env.API_KEY for the GenAI SDK
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  };
});