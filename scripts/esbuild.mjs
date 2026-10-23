import { cpSync, createReadStream, existsSync, mkdirSync, readFileSync, statSync, watch } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import * as esbuild from "esbuild-wasm";

await esbuild.initialize();

// Public Supabase settings for the PDA bundle (anon key only, protected by RLS).
// Read from the environment (Vercel) or from a gitignored .env.local; empty = local mode.
function readEnvLocal() {
  const values = {};
  if (!existsSync(".env.local")) return values;
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match) values[match[1]] = match[2].replace(/^(["'])(.*)\1$/, "$2");
  }
  return values;
}
const envLocal = readEnvLocal();
const publicEnv = (name) => process.env[name] ?? envLocal[name] ?? "";

const shared = {
  define: {
    "process.env.PUBLIC_SUPABASE_URL": JSON.stringify(publicEnv("PUBLIC_SUPABASE_URL")),
    "process.env.PUBLIC_SUPABASE_ANON_KEY": JSON.stringify(publicEnv("PUBLIC_SUPABASE_ANON_KEY")),
    "process.env.PUBLIC_WAITERS_JSON": JSON.stringify(publicEnv("PUBLIC_WAITERS_JSON")),
  },
  // Two independent bundles: public site (main) and waiter PDA (pda).
  entryPoints: { main: "src/main.jsx", pda: "src/pda/main.jsx" },
  bundle: true,
  outdir: "dist",
  format: "esm",
  jsx: "automatic",
  loader: { ".js": "jsx" },
  publicPath: "/",
  assetNames: "assets/[name]",
  entryNames: "assets/[name]",
  target: ["es2022"],
};

function publish() {
  mkdirSync("dist", { recursive: true });
  cpSync("index.html", "dist/index.html");
  mkdirSync("dist/sala", { recursive: true });
  cpSync("sala.html", "dist/sala/index.html");
  cpSync("public", "dist", { recursive: true });
}

function serveDist(port) {
  const root = resolve("dist");
  const types = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".svg": "image/svg+xml",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
  };
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    const pathname = decodeURIComponent(url.pathname);
    const relative = pathname.replace(/^[/\\]+/, "");
    let file = normalize(join(root, relative));
    if (!file.startsWith(root + sep) && file !== root) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }
    if (existsSync(file) && statSync(file).isDirectory()) {
      if (!pathname.endsWith("/")) {
        res.writeHead(301, { Location: `${pathname}/${url.search}` });
        res.end();
        return;
      }
      file = join(file, "index.html");
    }
    if (!existsSync(file) || !statSync(file).isFile()) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, {
      "Content-Type": types[extname(file)] ?? "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    createReadStream(file).pipe(res);
  });
  server.listen(port, "127.0.0.1", () => {
    console.log(`Pitteri 56  http://127.0.0.1:${port}`);
  });
}

publish();

if (process.argv.includes("--watch")) {
  const ctx = await esbuild.context(shared);
  await ctx.watch();
  // Re-publish static files (html, public/) when they change.
  let timer;
  const republish = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        publish();
      } catch (error) {
        console.error("publish failed:", error.message);
      }
    }, 50);
  };
  for (const target of ["index.html", "sala.html", "public"]) {
    watch(target, { recursive: true }, republish);
  }
  serveDist(Number(process.env.PORT) || 5173);
} else {
  await esbuild.build({ ...shared, minify: true });
  console.log("Built dist/");
}
