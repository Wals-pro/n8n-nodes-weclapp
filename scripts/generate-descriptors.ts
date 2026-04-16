#!/usr/bin/env tsx
/**
 * generate-descriptors.ts
 *
 * Reads docs/weclapp-openapi.yaml and emits nodes/Weclapp/generated/openapiMetadata.ts:
 *   - openapiEntities: string[] — top-level collection entities
 *   - entityActions: Record<string, string[]> — per-entity action names
 *   - binaryEndpoints: string[] — paths whose response is binary (PDF, image, zip, etc.)
 *
 * Run via: npm run codegen
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parse as parseYaml } from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const openapiPath = resolve(repoRoot, 'docs', 'weclapp-openapi.yaml');
const outputPath = resolve(repoRoot, 'nodes', 'Weclapp', 'generated', 'openapiMetadata.ts');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface OpenAPISpec {
  paths: Record<string, PathItem>;
}

interface PathItem {
  get?: Operation;
  post?: Operation;
  put?: Operation;
  delete?: Operation;
  patch?: Operation;
}

interface Operation {
  responses?: Record<string, ResponseObject>;
  tags?: string[];
}

interface ResponseObject {
  content?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Parse OpenAPI spec
// ---------------------------------------------------------------------------
const raw = readFileSync(openapiPath, 'utf-8');
const spec = parseYaml(raw, { merge: true }) as OpenAPISpec;

// Binary content types that indicate a binary-download endpoint
const BINARY_CONTENT_TYPES = new Set([
  'application/pdf',
  'application/octet-stream',
  'application/zip',
  'application/x-zip-compressed',
]);

function isBinaryContentType(ct: string): boolean {
  return BINARY_CONTENT_TYPES.has(ct) || ct.startsWith('image/');
}

function hasBinaryResponse(pathItem: PathItem): boolean {
  for (const op of Object.values(pathItem)) {
    if (typeof op !== 'object' || op === null) continue;
    const operation = op as Operation;
    if (!operation.responses) continue;
    for (const response of Object.values(operation.responses)) {
      if (typeof response !== 'object' || response === null) continue;
      const resp = response as ResponseObject;
      if (!resp.content) continue;
      for (const ct of Object.keys(resp.content)) {
        if (isBinaryContentType(ct)) return true;
      }
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Parse paths
// ---------------------------------------------------------------------------
const entityNames = new Set<string>();
const entityActions: Record<string, string[]> = {};
const binaryEndpoints: string[] = [];

// Utility path segments that are not CRUD entities (same list as vendor-sdk-metadata.ts)
const UTILITY_SEGMENTS = new Set(['meta', 'system', 'job', 'tax', 'salesChannel', 'propertyTranslation']);

for (const [path, pathItem] of Object.entries(spec.paths ?? {})) {
  const parts = path.split('/').filter(Boolean);

  // Check for binary endpoints (any path)
  if (hasBinaryResponse(pathItem)) {
    binaryEndpoints.push(path);
  }

  if (parts.length === 1) {
    // Top-level collection: /{entity}
    const entityName = parts[0];
    if (UTILITY_SEGMENTS.has(entityName)) continue;
    if (!pathItem.get) continue; // Collection endpoints always have GET
    entityNames.add(entityName);
  } else if (parts.length === 4 && parts[1] === 'id' && parts[2] === '{id}') {
    // Action path: /{entity}/id/{id}/{action}
    const entityName = parts[0];
    const actionName = parts[3];
    if (!entityActions[entityName]) entityActions[entityName] = [];
    if (!entityActions[entityName].includes(actionName)) {
      entityActions[entityName].push(actionName);
    }
  }
}

// Sort for stable output
const sortedEntities = [...entityNames].sort();
binaryEndpoints.sort();
for (const entity of Object.keys(entityActions)) {
  entityActions[entity].sort();
}

// ---------------------------------------------------------------------------
// Emit openapiMetadata.ts
// ---------------------------------------------------------------------------
const lines: string[] = [
  '// AUTO-GENERATED — do not edit by hand.',
  '// Regenerate with: npm run codegen',
  '// Source: docs/weclapp-openapi.yaml (parsed by scripts/generate-descriptors.ts)',
  '',
  '/**',
  ' * Top-level weclapp collection entities parsed from the OpenAPI spec.',
  ' * Each entry maps to a /{entity} GET path.',
  ' */',
  `export const openapiEntities: string[] = ${JSON.stringify(sortedEntities, null, 2)};`,
  '',
  '/**',
  ' * Per-entity action names found at /{entity}/id/{id}/{action} paths.',
  ' */',
  'export const entityActions: Record<string, string[]> = {',
];

for (const entity of sortedEntities) {
  if (entityActions[entity]?.length) {
    lines.push(`  ${JSON.stringify(entity)}: ${JSON.stringify(entityActions[entity])},`);
  }
}
// Also add actions for entities that have actions but may not be in the collection list
for (const [entity, actions] of Object.entries(entityActions).sort(([a], [b]) => a.localeCompare(b))) {
  if (!entityNames.has(entity) && actions.length) {
    lines.push(`  ${JSON.stringify(entity)}: ${JSON.stringify(actions)},`);
  }
}

lines.push('};');
lines.push('');
lines.push('/**');
lines.push(' * Paths whose response contains binary content (PDF, image, zip, octet-stream).');
lines.push(' * The node must use binary-download mode (no JSON parsing) for these endpoints.');
lines.push(' */');
lines.push(`export const binaryEndpoints: string[] = ${JSON.stringify(binaryEndpoints, null, 2)};`);
lines.push('');

// Ensure output directory exists
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, lines.join('\n'), 'utf-8');

const actionEntityCount = Object.values(entityActions).filter((a) => a.length > 0).length;
console.log(`✓ openapiMetadata.ts — ${sortedEntities.length} entities, ${actionEntityCount} entities with actions, ${binaryEndpoints.length} binary endpoints`);
console.log(`  → ${outputPath}`);
