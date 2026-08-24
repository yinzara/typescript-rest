import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        ignores: ['dist/**', 'reports/**', 'node_modules/**', 'coverage/**']
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['src/**/*.ts', 'test/**/*.ts'],
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname
            }
        },
        rules: {
            // Ported from the previous tslint.json
            'no-console': ['error', { allow: ['warn', 'info', 'debug', 'trace'] }],
            'semi': 'off',
            '@typescript-eslint/semi': 'off',
            'quotes': ['error', 'single', { avoidEscape: true, allowTemplateLiterals: true }],
            'object-shorthand': ['error', 'never'],
            '@typescript-eslint/array-type': ['error', { default: 'generic' }],
            '@typescript-eslint/no-empty-interface': 'off',
            '@typescript-eslint/no-var-requires': 'off',
            '@typescript-eslint/no-require-imports': 'off',
            '@typescript-eslint/ban-types': 'off',
            '@typescript-eslint/no-unsafe-function-type': 'off',
            '@typescript-eslint/no-wrapper-object-types': 'off',
            '@typescript-eslint/no-empty-object-type': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/explicit-module-boundary-types': 'off',
            '@typescript-eslint/no-unused-vars': ['error', {
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_'
            }]
        }
    },
    {
        files: ['test/**/*.ts'],
        rules: {
            'no-console': 'off',
            // Test fixtures and express handlers routinely declare positional
            // parameters they do not read.
            '@typescript-eslint/no-unused-vars': ['error', {
                args: 'none',
                varsIgnorePattern: '^_'
            }]
        }
    },
    {
        files: ['**/*.js', '**/*.cjs'],
        ...tseslint.configs.disableTypeChecked,
        languageOptions: {
            sourceType: 'commonjs',
            globals: { module: 'writable', require: 'readonly', __dirname: 'readonly' }
        }
    },
    {
        files: ['**/*.mjs'],
        ...tseslint.configs.disableTypeChecked
    }
);
