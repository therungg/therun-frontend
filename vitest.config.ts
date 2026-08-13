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
        // Needed so @testing-library/react's built-in afterEach(cleanup) can
        // register itself (it checks for a global `afterEach`) — otherwise
        // every test file must call cleanup() manually or DOM trees from
        // earlier `it` blocks in the same file leak into later ones.
        globals: true,
        setupFiles: ['./vitest.setup.ts'],
        include: [
            'src/**/__tests__/*.test.ts',
            'src/**/__tests__/*.test.tsx',
            'app/**/*.test.ts',
            'app/**/*.test.tsx',
        ],
        // Component tests (.test.tsx) need a DOM; plain .test.ts files stay on
        // vitest's default node environment, which is faster and sufficient
        // for the pure-function tests already in this repo.
        //
        // `environmentMatchGlobs` doesn't exist in Vitest 4 (deprecated in v3,
        // removed in v4) and TypeScript won't catch it — `defineConfig`'s
        // overloads swallow the excess property. It was silently ignored, so
        // component tests ran under the default `node` environment with no
        // `document`. Each `.test.tsx` file must instead opt into jsdom itself
        // via a `// @vitest-environment jsdom` docblock as its first line.
    },
});
