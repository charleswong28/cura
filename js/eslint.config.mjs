/**
 * Root ESLint flat config for the monorepo.
 *
 * lint-staged runs `eslint --fix` from the `js/` directory (set in .husky/pre-commit),
 * so ESLint requires a config here. Each app's own eslint.config.mjs stays as the
 * canonical config for IDE tooling; this root file just scopes the same rules to
 * the right file paths so lint-staged can find them.
 */

import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import tailwindCanonicalClasses from "eslint-plugin-tailwind-canonical-classes";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/build/**",
      // API uses its own .eslintrc.js — exclude from flat config
      "apps/api/**",
    ],
  },

  // Next.js + TypeScript rules scoped to the home page app
  ...compat
    .extends("next/core-web-vitals", "next/typescript")
    .map((config) => ({
      ...config,
      files: ["apps/web-home-page/**/*.{js,jsx,ts,tsx}"],
    })),

  // Suppress the no-html-link-for-pages warning that fires when Next.js can't
  // find the pages directory relative to the monorepo root (it lives inside the app).
  {
    files: ["apps/web-home-page/**/*.{js,jsx,ts,tsx}"],
    rules: { "@next/next/no-html-link-for-pages": "off" },
  },

  // Tailwind class ordering — cssPath must be absolute when running from js/ root
  {
    files: ["apps/web-home-page/**/*.{js,jsx,ts,tsx}"],
    plugins: { "tailwind-canonical-classes": tailwindCanonicalClasses },
    rules: {
      "tailwind-canonical-classes/tailwind-canonical-classes": [
        "error",
        {
          cssPath: resolve(
            __dirname,
            "apps/web-home-page/src/app/globals.css"
          ),
        },
      ],
    },
  },
];
