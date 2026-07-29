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
        include: [
            'src/**/__tests__/*.test.ts',
            'app/**/*.test.ts',
            'app/**/*.test.tsx',
        ],
        // Component tests (.test.tsx) need a DOM; plain .test.ts files stay on
        // vitest's default node environment, which is faster and sufficient
        // for the pure-function tests already in this repo.
        environmentMatchGlobs: [['app/**/*.test.tsx', 'jsdom']],
    },
});
