import { config } from '@n8n/node-cli/eslint';
import tsEslint from 'typescript-eslint';

export default [
	...config,
	{
		// Allow underscore-prefixed names as intentionally unused (stub parameters)
		plugins: { '@typescript-eslint': tsEslint.plugin },
		rules: {
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					args: 'all',
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_',
				},
			],
		},
	},
	{
		// Exclude build scripts and vitest config — they use console/process/vitest imports
		// which are fine in CLI tools and devDependency configs, not in node bundles.
		ignores: ['scripts/**', 'vitest.config.ts'],
	},
];
