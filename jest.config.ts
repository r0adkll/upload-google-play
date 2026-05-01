import type {Config} from "jest";

const config: Config = {
    preset: "ts-jest",
    testEnvironment: "node",
    testMatch: ["**/*.test.ts"],
    clearMocks: true,
    verbose: true,
    collectCoverageFrom: [
        "src/**/*.ts",
        "!src/**/*.d.ts"
    ],
    coverageReporters: ["text", "text-summary", "json-summary", "lcov"]
};

export default config;
