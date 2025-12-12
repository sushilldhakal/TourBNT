module.exports = {
  overrides: [
    {
      files: ["**/*.{js,mjs,cjs,ts}"],
      parser: "@typescript-eslint/parser",
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
      },
      plugins: ["@typescript-eslint"],
      extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
      rules: {
        // Add your custom rules here
      },
    },
  ],
};
