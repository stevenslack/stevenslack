import { globalIgnores } from "eslint/config";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    eslint.configs.recommended,
    tseslint.configs.recommended,
    [
        globalIgnores([
            "**/node_modules",
            "**/dist",
            "**/public",
            "**/jest.config.js",
            "**/babel.config.cjs",
            "**/.astro/",
        ]), {
            languageOptions: {
                globals: {
                    ...globals.browser,
                    ...globals.jest,
                    ...globals.node,
                },

                parser: tsParser,
                ecmaVersion: 5,
                sourceType: "module",

                parserOptions: {
                    ecmaFeatures: {
                        globalReturn: true,
                        impliedStrict: true,
                    },

                    project: "./tsconfig.json",
                },
            },
        }
    ]
);