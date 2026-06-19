import type { Config } from "jest";

/**
 * Tests are compiled with ts-jest (not babel) so they are type-checked as they
 * run. The transform overrides `module` to CommonJS for the CJS test runtime,
 * independent of the NodeNext setting used for the library build.
 */
const config: Config = {
  testEnvironment: "node",
  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: "coverage",
  collectCoverageFrom: ["src/**/*.ts", "!src/index.ts"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      { tsconfig: { module: "CommonJS", moduleResolution: "node", verbatimModuleSyntax: false } },
    ],
  },
};

export default config;
