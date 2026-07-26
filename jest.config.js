/**
 * Jest config for platform-mocked unit tests (jest-expo).
 *
 * Scope today: pure logic + platform-branching modules that mock `react-native`
 * (e.g. the AI capability layer's iOS-vs-Android behavior). Full component-render tests
 * (@testing-library/react-native) are a follow-up — they need the React 19 /
 * react-test-renderer setup sorted and the UI-kit packages added to transformIgnorePatterns.
 */
module.exports = {
  preset: 'jest-expo',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  // Only pick up *.test.ts(x) — the standalone scripts/*.mjs suites run under plain node.
  testMatch: ['**/?(*.)+(test).ts?(x)'],
};
