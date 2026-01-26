import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile, mkdir, writeFile } from "fs/promises";
import path from "path";

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times
const allowlist = [
  "@google/generative-ai",
  "axios",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "pg",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

const ragConfig = {
  owner: "nyuoasis-cmd",
  repo: "school-newsletter-rag",
  ref: "main",
  metadataPath: "metadata/documents.json",
  categoriesPath: "config/categories.json",
};

const ragDataDir = path.resolve("shared", "rag-data");
const ragMetadataPath = path.join(ragDataDir, "documents.json");
const ragCategoriesPath = path.join(ragDataDir, "categories.json");

const buildRawUrl = (relativePath: string) =>
  `https://raw.githubusercontent.com/${ragConfig.owner}/${ragConfig.repo}/${ragConfig.ref}/${relativePath.replace(/^\/+/, "")}`;

async function downloadFile(url: string, outputPath: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }
  const body = await response.text();
  await writeFile(outputPath, body, "utf-8");
}

async function syncRagData() {
  if (process.env.RAG_SKIP_DOWNLOAD === "true") {
    console.log("Skipping RAG metadata download (RAG_SKIP_DOWNLOAD=true).");
    return;
  }

  await mkdir(ragDataDir, { recursive: true });
  await downloadFile(buildRawUrl(ragConfig.metadataPath), ragMetadataPath);
  await downloadFile(buildRawUrl(ragConfig.categoriesPath), ragCategoriesPath);
}

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("syncing RAG metadata...");
  await syncRagData();

  console.log("building client...");
  await viteBuild();

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "esm",
    outfile: "dist/index.js",
    target: "node18",
    banner: {
      js: [
        'import { createRequire } from "module";',
        "const require = createRequire(import.meta.url);",
      ].join("\n"),
    },
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: false,
    sourcemap: true,
    sourcesContent: true,
    external: externals,
    logLevel: "info",
  });
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
