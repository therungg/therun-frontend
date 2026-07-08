import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: {
            '~src': path.resolve(__dirname, 'src'),
            '~app': path.resolve(__dirname, 'app'),
        },
    },
    test: {
        include: ['src/**/__tests__/*.test.ts'],
    },
});
