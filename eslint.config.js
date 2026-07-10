import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ["dist"],
  },
  {
    plugins: { "react-hooks": reactHooks },
    rules: {
      // The two classic hooks rules. Enabling them makes the existing
      // `eslint-disable-line react-hooks/exhaustive-deps` meaningful instead of
      // fatal (ESLint erroring on an unknown rule previously failed lint).
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
    },
  }
);
