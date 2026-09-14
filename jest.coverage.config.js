// Runs the unit suites (package.json "jest") and the e2e suites together so
// that one coverage report includes controllers and repositories, which are
// only exercised end-to-end. Used by `pnpm test:cov`; needs the test database.
module.exports = {
  rootDir: '.',
  projects: ['<rootDir>', '<rootDir>/tests/jest-e2e.json'],
  // A project's own testTimeout is ignored once it runs under `projects`, so the e2e suites would silently fall back
  // to Jest's 5s default. argon2 plus coverage instrumentation overruns that, which showed up as random failures.
  testTimeout: 30000,
  // Serialised, because every database-backed suite truncates the same database. A worker rather than --runInBand,
  // so suites do not share one process's globals: an in-band run let a mocked global leak between files.
  maxWorkers: 1,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/main.ts',
    '!src/**/*.module.ts',
    '!src/database/schema/**',
    '!src/database/migrate.ts',
    '!src/security/blocklist/**',
  ],
  coverageThreshold: { global: { lines: 80, statements: 80, functions: 80, branches: 70 } },
};
