import { FlatCompat } from "@eslint/eslintrc";
import { globalIgnores } from "eslint/config";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  // .data/ is LocalFsStorageProvider's dev-only object store (gitignored,
  // used when no S3 endpoint is configured) — its transcoded segment files
  // are named *.ts (MPEG-TS), which ESLint otherwise mistakes for TypeScript.
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", ".data/**"]),
];

export default eslintConfig;
