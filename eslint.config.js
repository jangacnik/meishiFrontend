import js from '@eslint/js'
import vue from 'eslint-plugin-vue'
import tseslint from 'typescript-eslint'
import prettier from 'eslint-config-prettier'

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs['flat/recommended'],
  prettier,
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },
  {
    // TypeScript already catches undefined identifiers (and does it more accurately,
    // e.g. it understands DOM globals like `navigator`/`window`) — typescript-eslint's
    // own docs recommend turning this off rather than hand-listing browser globals.
    rules: {
      'no-undef': 'off',
    },
  },
)
