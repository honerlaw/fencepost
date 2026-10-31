// Architecture rules for src/. Sources: AGENTS.md and the v1 proposal's module boundaries.
const CLIENT = '^src/(components|lib|store|theme)/|^src/app/(_layout|index)';

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      from: {},
      to: { circular: true, viaOnly: { dependencyTypesNot: ['type-only'] } },
    },
    { name: 'not-to-unresolvable', severity: 'error', from: {}, to: { couldNotResolve: true } },
    {
      name: 'no-deprecated-core',
      severity: 'error',
      from: {},
      to: { dependencyTypes: ['core'], path: '^(punycode|domain|sys|constants)$' },
    },
    {
      name: 'pure-core-stays-pure',
      comment: 'src/game and src/cards run in plain Node so they stay testable.',
      severity: 'error',
      from: { path: '^src/(game|cards)/' },
      to: {
        path: [
          '^src/(components|store|lib|server|app|theme)/',
          'node_modules/(react|react-native|expo|expo-[^/]+|@expo/[^/]+|tamagui|@tamagui/[^/]+|zustand)/',
        ],
      },
    },
    {
      name: 'client-never-imports-server',
      comment: 'Server code holds the prompt and the API key.',
      severity: 'error',
      from: { path: CLIENT },
      to: { path: '^src/server/', dependencyTypesNot: ['type-only'] },
    },
    {
      name: 'server-only-through-api-routes',
      severity: 'error',
      from: { path: '^src/', pathNot: ['^src/app/api/', '^src/server/'] },
      to: { path: '^src/server/', dependencyTypesNot: ['type-only'] },
    },
    {
      name: 'server-stays-headless',
      severity: 'error',
      from: { path: '^src/server/' },
      to: { path: '^src/(components|store|theme|app)/' },
    },
    {
      name: 'no-dev-dependency-in-production',
      comment: 'A dev dependency is missing from the production image.',
      severity: 'error',
      from: { path: '^src/', pathNot: '\\.test\\.tsx?$' },
      to: { dependencyTypes: ['npm-dev'], dependencyTypesNot: ['type-only'], pathNot: 'node_modules/@types/' },
    },
    {
      name: 'no-tests-from-production',
      severity: 'error',
      from: { pathNot: '\\.(test|spec)\\.tsx?$' },
      to: { path: '\\.test\\.tsx?$' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '__snapshots__' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.json' },
    enhancedResolveOptions: {
      extensions: ['.web.tsx', '.web.ts', '.ts', '.tsx', '.mjs', '.js', '.json'],
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default', 'types'],
    },
  },
};
