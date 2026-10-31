// https://docs.expo.dev/guides/using-eslint/
//
// Every rule here is an error, and warnings fail the build (`--max-warnings 0`). Turning a rule
// off, or adding a disable comment, needs a reason next to it. See AGENTS.md "Guardrails".
import comments from '@eslint-community/eslint-plugin-eslint-comments/configs';
import agentic from '@onerlaw/agentic-eslint-plugin';
import vitest from '@vitest/eslint-plugin';
import expoConfig from 'eslint-config-expo/flat.js';
import { createTypeScriptImportResolver } from 'eslint-import-resolver-typescript';
import { flatConfigs as importX } from 'eslint-plugin-import-x';
import noUnsanitized from 'eslint-plugin-no-unsanitized';
import playwright from 'eslint-plugin-playwright';
import promise from 'eslint-plugin-promise';
import effects from 'eslint-plugin-react-you-might-not-need-an-effect';
import prettier from 'eslint-config-prettier/flat';
import { configs as regexp } from 'eslint-plugin-regexp';
import security from 'eslint-plugin-security';
import sonarjs from 'eslint-plugin-sonarjs';
import unicorn from 'eslint-plugin-unicorn';
import { eslint_plugin_vibe_proof as vibeProof } from 'eslint-plugin-vibe-proof';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';

const TS = ['**/*.{ts,tsx,mts}'];
const SRC = ['src/**/*.{ts,tsx}'];
const TESTS = ['**/*.test.ts'];
const E2E = ['e2e/**/*.ts'];

// Bans shared by every layer of src/. `no-restricted-syntax` does not merge across blocks, so each
// block that adds a selector spreads this list.
const NO_PROCESS_ENV = {
  selector: "MemberExpression[object.name='process'][property.name='env']",
  message: 'Read env only in src/server/from-env.ts, which keeps secrets out of the client bundle.',
};
const NO_CAST_JSON_PARSE = {
  selector: "TSAsExpression > CallExpression[callee.object.name='JSON'][callee.property.name='parse']",
  message: 'JSON.parse returns unknown data. Validate it with zod instead of casting it.',
};
// .minerva/knowledge/2026-10-29-bug-expo-fetch-ignores-relative-urls-on-native
const NO_RELATIVE_API_FETCH = {
  selector: String.raw`CallExpression[callee.name='fetch'] > Literal.arguments:first-child[value=/^\//]`,
  message: 'expo/fetch ignores relative URLs on native. Wrap the path in apiUrl().',
};
const NO_RELATIVE_API_FETCH_TEMPLATE = {
  selector: String.raw`CallExpression[callee.name='fetch'] > TemplateLiteral.arguments:first-child > TemplateElement:first-child[value.raw=/^\//]`,
  message: NO_RELATIVE_API_FETCH.message,
};
const SHARED_SYNTAX_BANS = [NO_PROCESS_ENV, NO_CAST_JSON_PARSE, NO_RELATIVE_API_FETCH, NO_RELATIVE_API_FETCH_TEMPLATE];

const FRAMEWORK_IMPORTS = {
  group: [
    'react',
    'react-*',
    'react/*',
    'expo',
    'expo-*',
    'expo/*',
    '@expo/*',
    'tamagui',
    '@tamagui/*',
    'zustand',
    'zustand/*',
  ],
  message: 'src/game and src/cards are the pure core: no React, Expo, Tamagui or zustand.',
};
const SERVER_IMPORTS = {
  group: ['@/server', '@/server/*', '**/server/*', 'ai', '@openrouter/*', 'express'],
  message: 'Server code holds the prompt and the API key. Only src/app/api/*+api.ts may import it.',
};

export default defineConfig([
  globalIgnores([
    'dist/*',
    'dist-native/*',
    '.expo/*',
    '.tamagui/*',
    '.minerva/*',
    'coverage/*',
    'reports/*',
    'test-results/*',
    'playwright-report/*',
    'expo-env.d.ts',
  ]),

  expoConfig,

  // Type-aware TypeScript.
  {
    files: TS,
    extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: { allowDefaultProject: ['vitest.config.mts'] },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/no-floating-promises': ['error', { ignoreVoid: false }],
      '@typescript-eslint/no-unnecessary-type-conversion': 'error',
      '@typescript-eslint/prefer-readonly': 'error',
      '@typescript-eslint/require-array-sort-compare': 'error',
      '@typescript-eslint/strict-boolean-expressions': 'error',
      '@typescript-eslint/dot-notation': ['error', { allowIndexSignaturePropertyAccess: false }],
      // Numbers read fine in a template, and the option keeps the real catch: objects and undefined.
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      // `() => doThing()` is the idiom for handlers; the rule's real catch is a void value being used.
      '@typescript-eslint/no-confusing-void-expression': ['error', { ignoreArrowShorthand: true }],
    },
  },

  // General correctness.
  {
    rules: {
      // `== null` is the one sound loose comparison: it means null or undefined and nothing else.
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-console': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-param-reassign': 'error',
      'no-return-assign': 'error',
      'no-self-compare': 'error',
      'no-template-curly-in-string': 'error',
      'no-throw-literal': 'error',
      'no-unreachable-loop': 'error',
      'no-useless-catch': 'error',
      complexity: ['error', 15],
      'max-depth': ['error', 4],
      'max-params': ['error', 5],
    },
  },

  // Static-analysis bundles.
  sonarjs.configs.recommended,
  security.configs.recommended,
  noUnsanitized.configs.recommended,
  regexp.recommended,
  unicorn.configs.recommended,
  {
    rules: {
      // null is the card wire format: the model's JSON schema marks unused fields null.
      'unicorn/no-null': 'off',
      // Naming style with no defect behind it: 115 hits on names like `props` and `i`.
      'unicorn/prevent-abbreviations': 'off',
      // It reports every `array[index]`. noUncheckedIndexedAccess and CodeQL catch the real cases.
      'security/detect-object-injection': 'off',
    },
  },
  promise.configs['flat/recommended'],
  comments.recommended,
  {
    rules: {
      '@eslint-community/eslint-comments/require-description': 'error',
      '@eslint-community/eslint-comments/no-unused-disable': 'error',
      '@eslint-community/eslint-comments/no-use': ['error', { allow: ['eslint-disable-next-line'] }],
    },
  },

  // Dependencies must be declared and resolvable. eslint-config-expo registers `import`, so this
  // adds import-x under its own name and only the rules the base config lacks.
  {
    ...importX.typescript,
    files: TS,
    rules: {
      'import-x/no-extraneous-dependencies': 'error',
      'import-x/no-self-import': 'error',
      'import-x/no-useless-path-segments': 'error',
      'import-x/no-mutable-exports': 'error',
    },
    settings: {
      ...importX.typescript.settings,
      'import-x/resolver-next': [createTypeScriptImportResolver({ project: import.meta.dirname })],
    },
  },

  // React.
  {
    files: ['src/**/*.tsx'],
    ...effects.configs.strict,
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { 'vibe-proof': vibeProof },
    rules: {
      'vibe-proof/ban-eslint-disable': 'error',
      'vibe-proof/no-constant-array-includes': 'error',
      'vibe-proof/no-eager-await-in-condition': 'error',
      'vibe-proof/no-location-assign-relative-destination': 'error',
      'vibe-proof/jsx-no-duplicate-props': 'error',
      'vibe-proof/react-ban-peak-via-ref': 'error',
      'vibe-proof/react-detect-potential-race-condition': 'error',
      'vibe-proof/react-no-circular-effect': 'error',
      'vibe-proof/react-no-manual-use-effect-race-condition-prevention': 'error',
      'vibe-proof/react-no-mixing-controlled-and-uncontrolled-props': 'error',
      'vibe-proof/react-no-use-effect-watching': 'error',
      'vibe-proof/react-no-use-state-as-ref': 'error',
      'vibe-proof/react-prefer-state-updater-function': 'error',
    },
  },

  // @onerlaw/agentic-eslint-plugin. One block per rule on purpose: the rules walk different file
  // sets, and a shared block would silently unguard whatever it ignores.
  // Off because nothing here matches them: workspace-runtime-imports (no workspaces),
  // rpc-error-standard (no Connect-RPC), markdown-map-code-styles (no markdown renderer),
  // quality-model-token-floor (no reasoning-tier function; the cap is one env-configured value),
  // workspace-chrome-flex (no two-pane layout: the app is one column, where `flex: 1` is correct).
  {
    plugins: { agentic },
    rules: { 'agentic/no-credential-in-url': 'error', 'agentic/no-biome-ignore': 'error' },
  },
  {
    files: SRC,
    ignores: ['src/app/**', ...TESTS],
    plugins: { agentic },
    rules: { 'agentic/one-export-per-file': 'error' },
  },
  {
    files: ['src/**/*.tsx'],
    plugins: { agentic },
    rules: { 'agentic/tamagui-native-id': 'error' },
  },
  {
    files: ['src/components/**/*.tsx', 'src/app/**/*.tsx'],
    plugins: { agentic },
    rules: { 'agentic/responsive-two-pane-flex': 'error' },
  },

  // Architecture, from .minerva/knowledge and AGENTS.md.
  {
    files: SRC,
    rules: { 'no-restricted-syntax': ['error', ...SHARED_SYNTAX_BANS] },
  },
  {
    files: ['src/game/**/*.ts', 'src/cards/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [FRAMEWORK_IMPORTS] }],
      'no-restricted-syntax': [
        'error',
        ...SHARED_SYNTAX_BANS,
        {
          selector: "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message: 'The pure core takes its clock from deps.now.',
        },
        {
          selector: "CallExpression[callee.object.name='Math'][callee.property.name='random']",
          message: 'The pure core takes an injected RNG.',
        },
      ],
    },
  },
  {
    files: [
      'src/components/**/*.{ts,tsx}',
      'src/lib/**/*.ts',
      'src/store/**/*.ts',
      'src/theme/**/*.ts',
      'src/app/_layout.tsx',
      'src/app/index.tsx',
    ],
    rules: { 'no-restricted-imports': ['error', { patterns: [SERVER_IMPORTS] }] },
  },
  {
    files: ['src/server/from-env.ts'],
    rules: { 'no-restricted-syntax': ['error', ...SHARED_SYNTAX_BANS.filter((ban) => ban !== NO_PROCESS_ENV)] },
  },

  // Only these may print.
  {
    files: ['src/server/log.ts', 'scripts/**', 'server.js'],
    rules: { 'no-console': 'off' },
  },

  // Metro and the Express server load these as CommonJS.
  {
    files: ['metro.config.js', 'server.js'],
    rules: { 'unicorn/prefer-module': 'off' },
  },

  // eslint-plugin-import cannot parse the ESM-only plugins this file imports.
  {
    files: ['eslint.config.mjs'],
    rules: {
      'import/namespace': 'off',
      'import/no-unresolved': 'off',
      'import/default': 'off',
      'import/named': 'off',
      'import/no-named-as-default': 'off',
      'import/no-named-as-default-member': 'off',
    },
  },

  // Local-only code: these point at 127.0.0.1 stubs and read their own files.
  {
    files: [...TESTS, ...E2E, 'scripts/**', 'playwright.config.ts'],
    rules: {
      'sonarjs/no-hardcoded-ip': 'off',
      'sonarjs/no-clear-text-protocols': 'off',
      'security/detect-non-literal-fs-filename': 'off',
      'security/detect-non-literal-regexp': 'off',
      'unicorn/no-process-exit': 'off',
    },
  },

  // Tests.
  {
    files: TESTS,
    ...vitest.configs.recommended,
    rules: {
      ...vitest.configs.recommended.rules,
      'vitest/no-focused-tests': 'error',
      'vitest/no-disabled-tests': 'error',
      'vitest/expect-expect': 'error',
      'vitest/no-conditional-tests': 'error',
      // vitest accepts a failure message as expect's second argument.
      'vitest/valid-expect': ['error', { maxArgs: 2 }],
      // A wrong assumption in a test fails that test by itself.
      '@typescript-eslint/no-non-null-assertion': 'off',
      // Test doubles are often empty on purpose.
      '@typescript-eslint/no-empty-function': 'off',
    },
  },
  {
    files: E2E,
    ...playwright.configs['flat/recommended'],
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      'playwright/no-focused-test': 'error',
      'playwright/no-skipped-test': 'error',
      'playwright/no-wait-for-timeout': 'error',
      // A wrong assumption in a test fails that test by itself.
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },

  // Plain JS has no type information.
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [tseslint.configs.disableTypeChecked],
  },

  // Prettier owns formatting, so this stays last.
  prettier,
]);
