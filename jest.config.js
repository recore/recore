module.exports = {
  transform: {
    '^.+\\.[jt]s$': 'ts-jest',
  },
  testRegex: '(/tests?/.*|(\\.|/)(test|spec))\\.[jt]s$',
  moduleFileExtensions: [
    'ts',
    'js',
    'json',
  ],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{ts}',
  ],
};
