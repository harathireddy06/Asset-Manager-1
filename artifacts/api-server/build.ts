import path from "path";
import { fileURLToPath } from "url";
import { build as esbuild } from "esbuild";
import { rm, readFile } from "fs/promises";
import { execSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const allowlist = [
  "cors",
  "express",
  "zod",
];

async function buildAll() {
  const distDir = path.resolve(__dirname, "dist");
  await rm(distDir, { recursive: true, force: true });

  // 1. Build the frontend (React + Vite)
  const frontendDir = path.resolve(__dirname, "../transport-tracker");
  console.log("building frontend...");
  execSync("pnpm run build", {
    cwd: frontendDir,
    stdio: "inherit",
    env: {
      ...process.env,
      PORT: "3000",
      BASE_PATH: "/",
      NODE_ENV: "production",
    },
  });

  // 2. Build the backend (esbuild bundle)
  console.log("building server...");
  const pkgPath = path.resolve(__dirname, "package.json");
  const pkg = JSON.parse(await readFile(pkgPath, "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter(
    (dep) =>
      !allowlist.includes(dep) &&
      !(pkg.dependencies?.[dep]?.startsWith("workspace:")),
  );

  await esbuild({
    entryPoints: [path.resolve(__dirname, "src/index.ts")],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: path.resolve(distDir, "index.js"),
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: false,
    external: externals,
    logLevel: "info",
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
