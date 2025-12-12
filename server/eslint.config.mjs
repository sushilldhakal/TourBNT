import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import parser from "@typescript-eslint/parser";

export default [
  {
    files: ["**/*.{js,mjs,cjs,ts}"],
    languageOptions: {
      globals: globals.browser,
      parser, // Use TypeScript parser
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: {
      // Add your custom rules here
    },
  },
  // Directly include recommended configurations without using "extends"
  {
    ...pluginJs.configs.recommended,
    plugins: { ...pluginJs.configs.recommended.plugins },
  },
  {
    ...tseslint.configs.recommended,
    plugins: { ...tseslint.configs.recommended.plugins },
  },
];
