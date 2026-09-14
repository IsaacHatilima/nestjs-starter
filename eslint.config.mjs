// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      // Prettier wraps code at 120; this catches what it will not reflow: comments and long strings.
      'max-len': [
        'error',
        {
          code: 120,
          tabWidth: 2,
          ignoreUrls: true,
          // A single-specifier import is one unsplittable path; Prettier wraps the rest.
          ignorePattern: '^import\\s',
          ignoreRegExpLiterals: true,
          ignoreStrings: false,
          ignoreTemplateLiterals: false,
          ignoreComments: false,
        },
      ],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      'prettier/prettier': ['error', { endOfLine: 'auto' }],
    },
  },
);
