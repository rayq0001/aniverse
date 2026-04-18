import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        proxy: {
          '/api': {
            target: 'http://localhost:3002',
            timeout: 300000,
          }
        }
      },
      plugins: [
        react(),
      ],
      // Only expose variables with VITE_ prefix to browser
      // DO NOT expose GEMINI_API_KEY here - it must stay server-side only
      define: {
        'import.meta.env.VITE_DEEPL_API_KEY': JSON.stringify(env.VITE_DEEPL_API_KEY),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        outDir: 'dist',
        emptyOutDir: true,
        sourcemap: false,
        rollupOptions: {
          output: {
            manualChunks: {
              'vendor-react': ['react', 'react-dom', 'react-router-dom'],
              'vendor-firebase': ['firebase/app', 'firebase/firestore', 'firebase/auth', 'firebase/storage'],
              'vendor-motion': ['framer-motion'],
              'vendor-charts': ['recharts'],
            }
          }
        }
      },
      // Prevent server-only packages from being included in the client bundle
      optimizeDeps: {
        exclude: ['@google/genai', 'multer', 'adm-zip', 'dotenv']
      },
      ssr: {
        noExternal: []
      }
    };
});
