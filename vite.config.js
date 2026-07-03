import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [
        laravel({
            input: 'resources/js/app.jsx',
            refresh: true,
        }),
        react(),
    ],

    server: {
        host: '0.0.0.0',
        port: 5173,
        strictPort: true,

        cors: true, // 🔥 IMPORTANT FIX

        hmr: {
            host: '192.168.1.44',
            protocol: 'ws',
        },
    },
});