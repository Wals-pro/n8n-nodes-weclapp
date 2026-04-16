import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		// Allow zero test files (workers will add tests in their PRs)
		passWithNoTests: true,
		include: ['test/**/*.{test,spec}.{ts,mts}'],
		exclude: ['node_modules', 'dist'],
	},
});
