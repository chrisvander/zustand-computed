import { defineConfig } from "oxlint"

export default defineConfig({
  plugins: ["eslint", "typescript", "unicorn", "oxc"],
  options: {
    typeAware: true,
  },
  env: {
    builtin: true,
  },
  rules: {
    "typescript/switch-exhaustiveness-check": "error",
  },
})
