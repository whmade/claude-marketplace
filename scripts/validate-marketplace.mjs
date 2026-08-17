#!/usr/bin/env node
// Structural validator for this Claude Code marketplace. No dependencies, no
// network, no auth - safe to run headless in CI and locally. It mirrors the
// checks `claude plugin validate` makes that matter for us, so a broken commit
// is caught before it reaches consumers (the plugin tracks `main` unversioned).
//
// Usage: node scripts/validate-marketplace.mjs
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const err = (msg) => errors.push(msg);

const KEBAB = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const RESERVED_IN_NAME = ["anthropic", "claude"];

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (e) {
    err(`${path}: invalid JSON - ${e.message}`);
    return null;
  }
}

// Parse a leading `--- ... ---` YAML frontmatter block just enough to read the
// top-level scalar keys `name` and `description`. Avoids a YAML dependency.
function frontmatterKeys(path) {
  const text = readFileSync(path, "utf8");
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const keys = {};
  for (const line of match[1].split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (m) keys[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return keys;
}

function checkName(name, where) {
  if (!KEBAB.test(name)) err(`${where}: name "${name}" must be kebab-case`);
  if (name.length > 64) err(`${where}: name "${name}" exceeds 64 characters`);
  for (const word of RESERVED_IN_NAME) {
    if (name.toLowerCase().includes(word)) {
      err(`${where}: name "${name}" contains reserved word "${word}"`);
    }
  }
}

// --- marketplace manifest ---
const marketplacePath = join(root, ".claude-plugin", "marketplace.json");
if (!existsSync(marketplacePath)) {
  err(".claude-plugin/marketplace.json is missing");
} else {
  const mk = readJson(marketplacePath);
  if (mk) {
    if (!mk.name) err("marketplace.json: missing required field `name`");
    else checkName(mk.name, "marketplace.json");
    if (!mk.owner?.name) err("marketplace.json: missing required `owner.name`");
    if (!Array.isArray(mk.plugins) || mk.plugins.length === 0) {
      err("marketplace.json: `plugins` must be a non-empty array");
    } else {
      const seen = new Set();
      for (const p of mk.plugins) {
        if (!p.name) { err("marketplace.json: a plugin entry lacks `name`"); continue; }
        checkName(p.name, `marketplace.json plugin "${p.name}"`);
        if (seen.has(p.name)) err(`marketplace.json: duplicate plugin name "${p.name}"`);
        seen.add(p.name);
        if (!p.source) { err(`plugin "${p.name}": missing \`source\``); continue; }
        if (typeof p.source !== "string") {
          err(`plugin "${p.name}": source must be a relative path string; other source types are not used in this marketplace`);
          continue;
        }
        validatePlugin(p.name, p.source);
      }
    }
  }
}

// --- each relative-path plugin ---
function validatePlugin(entryName, source) {
  if (!source.startsWith("./")) {
    err(`plugin "${entryName}": relative source must start with "./" (got "${source}")`);
    return;
  }
  const pluginDir = join(root, source);
  const manifestPath = join(pluginDir, ".claude-plugin", "plugin.json");
  if (!existsSync(manifestPath)) {
    err(`plugin "${entryName}": ${source}/.claude-plugin/plugin.json is missing`);
    return;
  }
  const manifest = readJson(manifestPath);
  if (manifest) {
    if (!manifest.name) err(`${source}/plugin.json: missing required \`name\``);
    else checkName(manifest.name, `${source}/plugin.json`);
    if (!manifest.license) err(`${source}/plugin.json: missing \`license\``);
  }
  // Guard against the most common layout mistake.
  if (existsSync(join(pluginDir, ".claude-plugin", "skills"))) {
    err(`plugin "${entryName}": skills/ must be at the plugin root, not inside .claude-plugin/`);
  }
  validateSkills(entryName, pluginDir);
}

function validateSkills(entryName, pluginDir) {
  const skillsDir = join(pluginDir, "skills");
  if (!existsSync(skillsDir)) {
    err(`plugin "${entryName}": no skills/ directory - the plugin ships no skills`);
    return;
  }
  let skillCount = 0;
  for (const name of readdirSync(skillsDir)) {
    const dir = join(skillsDir, name);
    if (!statSync(dir).isDirectory()) continue;
    skillCount++;
    const skillFile = join(dir, "SKILL.md");
    if (!existsSync(skillFile)) {
      err(`plugin "${entryName}": skill "${name}" has no SKILL.md`);
      continue;
    }
    if (!readFileSync(skillFile, "utf8").includes("SPDX-License-Identifier:")) {
      err(`skill "${name}": SKILL.md missing an SPDX-License-Identifier header`);
    }
    const fm = frontmatterKeys(skillFile);
    if (!fm) { err(`skill "${name}": SKILL.md has no frontmatter block`); continue; }
    if (!fm.name) err(`skill "${name}": frontmatter missing \`name\``);
    else {
      checkName(fm.name, `skill "${name}"`);
      if (fm.name !== name) {
        err(`skill "${name}": frontmatter name "${fm.name}" != directory "${name}"`);
      }
    }
    if (!fm.description) err(`skill "${name}": frontmatter missing \`description\``);
    else if (fm.description.length > 1024) {
      err(`skill "${name}": description exceeds 1024 characters`);
    }
  }
  if (skillCount === 0) err(`plugin "${entryName}": skills/ contains no skills`);
}

if (errors.length) {
  console.error(`✗ marketplace validation failed (${errors.length}):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log("✓ marketplace validation passed");
