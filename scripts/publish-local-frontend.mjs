#!/usr/bin/env node
/** Publish a main-built renderer without restarting the desktop app or its daemon. */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync, renameSync, cpSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";

const repo = process.cwd();
const git = (...args) => execFileSync("git", args, { cwd: repo, encoding: "utf8" }).trim();
const sha = git("rev-parse", "HEAD");
if (git("rev-parse", "fork/main") !== sha)
  throw Error("Build and publish the exact fork/main commit.");
git("diff", "--exit-code", "HEAD");
const dist = join(repo, "packages/app/dist");
if (!existsSync(join(dist, "index.html")))
  throw Error("Run the production electron web export from main first.");
const app = "/Applications/Paseo.app";
const version = execFileSync(
  "/usr/libexec/PlistBuddy",
  ["-c", "Print :CFBundleShortVersionString", join(app, "Contents/Info.plist")],
  { encoding: "utf8" },
).trim();
const sourceVersion = JSON.parse(readFileSync(join(repo, "package.json"), "utf8")).version;
if (version !== sourceVersion)
  throw Error(
    "Installed app and source version differ; a full compatible desktop release is required.",
  );
const home = join(homedir(), "Library/Application Support/SurrealCKCompany");
const release = join(home, "native-client/releases", sha);
if (existsSync(release)) throw Error("This immutable frontend release already exists.");
mkdirSync(release, { recursive: true });
cpSync(dist, join(release, "app-dist"), { recursive: true });
const manifest = {
  source: "MainListActivity/paseo",
  sha,
  version,
  at: new Date().toISOString(),
  indexHash: createHash("sha256")
    .update(readFileSync(join(dist, "index.html")))
    .digest("hex"),
  daemonRestarted: false,
};
writeFileSync(join(release, "frontend-release.json"), JSON.stringify(manifest, null, 2) + "\n");
if (!process.argv.includes("--install")) {
  console.log(JSON.stringify({ release, installed: false }));
  process.exit(0);
}
const stage = join("/Applications", `.Paseo-frontend-${sha}.app`);
const backup = join(home, "native-client/backups", `${Date.now()}-${version}.app`);
if (existsSync(stage)) throw Error("Staging app already exists.");
mkdirSync(resolve(backup, ".."), { recursive: true });
// Clone before signing: never modify an executable inode mapped by a running process.
execFileSync("/bin/cp", ["-cR", app, stage]);
execFileSync("/bin/rm", ["-rf", join(stage, "Contents/Resources/app-dist")]);
cpSync(join(release, "app-dist"), join(stage, "Contents/Resources/app-dist"), { recursive: true });
cpSync(
  join(release, "frontend-release.json"),
  join(stage, "Contents/Resources/frontend-release.json"),
);
execFileSync(
  "/usr/bin/codesign",
  [
    "--force",
    "--sign",
    "-",
    "--preserve-metadata=identifier,entitlements,flags",
    "--timestamp=none",
    stage,
  ],
  { stdio: "inherit" },
);
execFileSync("/usr/bin/codesign", ["--verify", "--deep", "--strict", stage], { stdio: "inherit" });
renameSync(app, backup);
try {
  renameSync(stage, app);
} catch (error) {
  renameSync(backup, app);
  throw error;
}
writeFileSync(
  join(release, "installation.json"),
  JSON.stringify(
    { app, backup, installedAt: new Date().toISOString(), localSignature: "ad-hoc", ...manifest },
    null,
    2,
  ) + "\n",
);
console.log(JSON.stringify({ release, app, backup, installed: true, daemonRestarted: false }));
