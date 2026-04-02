module.exports = {
  preset: "jest-expo",
  rootDir: ".",
  testEnvironment: "node",
  setupFiles: ["./jest.setup.ts"],
  testMatch: ["<rootDir>/src/**/*.spec.ts"],
  moduleFileExtensions: ["ts", "tsx", "js", "json"],
};
