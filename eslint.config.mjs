import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    rules: {
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },
  {
    files: ["**/*.{jsx,tsx}"],
    rules: {
      "react/boolean-prop-naming": [
        "error",
        {
          rule: "^(is|has)[A-Z]([A-Za-z0-9]?)+",
          message: "Boolean props should start with 'is' or 'has'",
        },
      ],
    },
  },
  {
    files: ["**/*.{ts,tsx,mts,cts}"],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    rules: {
      "@typescript-eslint/naming-convention": [
        "error",
        {
          selector: "default",
          format: ["camelCase"],
        },
        {
          selector: "variable",
          format: ["PascalCase", "UPPER_CASE"],
          types: ["boolean"],
          prefix: ["is", "should", "has", "can", "did", "will"],
        },
        {
          selector: "variableLike",
          format: ["camelCase", "UPPER_CASE", "PascalCase"],
        },
        {
          selector: "parameter",
          format: ["camelCase", "PascalCase"],
        },
        {
          selector: "memberLike",
          modifiers: ["private"],
          format: ["camelCase"],
          leadingUnderscore: "forbid",
        },
        {
          selector: "typeLike",
          format: ["PascalCase"],
        },
        {
          selector: "enumMember",
          format: ["UPPER_CASE"],
        },
        {
          selector: "import",
          format: ["camelCase", "PascalCase"],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
