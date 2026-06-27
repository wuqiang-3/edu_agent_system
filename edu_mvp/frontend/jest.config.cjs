module.exports = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.(js|jsx)$': ['babel-jest', { presets: ['@babel/preset-env', '@babel/preset-react'] }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss)$': '<rootDir>/__mocks__/styleMock.js',
  },
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/__tests__/**/*.test.jsx',
    '**/*.test.js',
    '**/*.test.jsx',
  ],
}
