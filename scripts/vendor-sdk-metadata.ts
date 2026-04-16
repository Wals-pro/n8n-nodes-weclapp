#!/usr/bin/env tsx
/**
 * vendor-sdk-metadata.ts
 *
 * Reads docs/weclapp-openapi.yaml and extracts:
 *   - Entity names (weclappEntities)
 *   - Per-entity field names (entityFields)
 *   - Enum name → values map (enumValues)
 *
 * Writes nodes/Weclapp/generated/entityMetadata.ts.
 *
 * Run via: npm run codegen
 *
 * Note: @weclapp/sdk is a *code generator* (CLI tool), not an importable module.
 * The constants it generates (wServiceFactories, wEntityProperties, wEnums) are
 * produced from an OpenAPI spec — the same vendored spec we parse here directly.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parse as parseYaml } from 'yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const openapiPath = resolve(repoRoot, 'docs', 'weclapp-openapi.yaml');
const outputPath = resolve(repoRoot, 'nodes', 'Weclapp', 'generated', 'entityMetadata.ts');

// ---------------------------------------------------------------------------
// Parse OpenAPI spec
// ---------------------------------------------------------------------------
const raw = readFileSync(openapiPath, 'utf-8');
// Disable custom types to get plain JS objects (faster + avoids YAML merge tag issues)
const spec = parseYaml(raw, { merge: true }) as OpenAPISpec;

interface OpenAPISpec {
  paths: Record<string, PathItem>;
  components: {
    schemas: Record<string, SchemaObject>;
  };
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
  content?: Record<string, { schema?: SchemaObject }>;
}

interface SchemaObject {
  type?: string;
  enum?: string[];
  properties?: Record<string, SchemaObject>;
  allOf?: SchemaObject[];
  items?: SchemaObject;
  $ref?: string;
  readOnly?: boolean;
}

// Utility path segments that are not CRUD entities (same list as generate-descriptors.ts)
const UTILITY_SEGMENTS = new Set(['meta', 'system', 'job', 'tax', 'salesChannel', 'propertyTranslation']);

// ---------------------------------------------------------------------------
// Step 1: Identify entity names from top-level collection paths
// /{entity} paths that have a GET operation are collection endpoints.
// ---------------------------------------------------------------------------
const entityNames = new Set<string>();

for (const [path, pathItem] of Object.entries(spec.paths ?? {})) {
  // Must be a simple /{entityName} path (collection endpoint)
  const parts = path.split('/').filter(Boolean);
  if (parts.length !== 1) continue;

  const entityName = parts[0];

  // Skip utility path segments that are not CRUD entities
  if (UTILITY_SEGMENTS.has(entityName)) continue;

  // Must have a GET operation (entities have GET for listing)
  if (!pathItem.get) continue;

  entityNames.add(entityName);
}

// ---------------------------------------------------------------------------
// Step 2: Collect enum schemas and entity field schemas
// ---------------------------------------------------------------------------
const schemas = spec.components?.schemas ?? {};

const enumValues: Record<string, string[]> = {};
const entityFields: Record<string, string[]> = {};

// Collect enums: schemas that have top-level `enum` array
for (const [name, schema] of Object.entries(schemas)) {
  if (schema.enum && Array.isArray(schema.enum)) {
    enumValues[name] = schema.enum as string[];
  }
}

// Helper: resolve a $ref string to its schema name
function refName(ref: string): string {
  return ref.split('/').pop() ?? ref;
}

// Helper: collect all properties from a schema, following allOf chains (non-circular)
function collectProperties(schema: SchemaObject, visited = new Set<string>()): string[] {
  const props: string[] = [];

  if (schema.properties) {
    props.push(...Object.keys(schema.properties));
  }

  if (schema.allOf) {
    for (const sub of schema.allOf) {
      if (sub.$ref) {
        const name = refName(sub.$ref);
        if (!visited.has(name) && schemas[name]) {
          visited.add(name);
          props.push(...collectProperties(schemas[name], visited));
        }
      } else {
        // Inline allOf entry
        props.push(...collectProperties(sub, visited));
      }
    }
  }

  return [...new Set(props)];
}

// Collect fields for each entity
for (const entityName of entityNames) {
  const schema = schemas[entityName];
  if (!schema) continue;

  const fields = collectProperties(schema, new Set([entityName]));
  if (fields.length > 0) {
    entityFields[entityName] = fields.sort();
  }
}

// Sort entity names for stable output
const sortedEntities = [...entityNames].sort();

// ---------------------------------------------------------------------------
// Step 3: Emit entityMetadata.ts
// ---------------------------------------------------------------------------
const lines: string[] = [
  '// AUTO-GENERATED — do not edit by hand.',
  '// Regenerate with: npm run codegen',
  '// Source: docs/weclapp-openapi.yaml (parsed by scripts/vendor-sdk-metadata.ts)',
  '',
  '/**',
  ' * List of weclapp entity names available in the API.',
  ' * Equivalent to the keys of `wServiceFactories` in a generated @weclapp/sdk.',
  ' */',
  `export const weclappEntities: string[] = ${JSON.stringify(sortedEntities, null, 2)};`,
  '',
  '/**',
  ' * Map of entity name → array of field names for that entity.',
  ' * Used for filter field dropdowns and field projection pickers.',
  ' * Equivalent to `wEntityProperties` in a generated @weclapp/sdk.',
  ' */',
  'export const entityFields: Record<string, string[]> = {',
];

for (const entity of sortedEntities) {
  if (entityFields[entity]) {
    lines.push(`  ${JSON.stringify(entity)}: ${JSON.stringify(entityFields[entity])},`);
  }
}

lines.push('};');
lines.push('');
lines.push('/**');
lines.push(' * Map of enum name → array of valid string values.');
lines.push(' * Used for operator/status dropdown options in resource descriptors.');
lines.push(' * Equivalent to `wEnums` in a generated @weclapp/sdk.');
lines.push(' */');
lines.push('export const enumValues: Record<string, string[]> = {');

for (const [name, values] of Object.entries(enumValues).sort(([a], [b]) => a.localeCompare(b))) {
  lines.push(`  ${JSON.stringify(name)}: ${JSON.stringify(values)},`);
}

lines.push('};');
lines.push('');

// Ensure output directory exists
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, lines.join('\n'), 'utf-8');

console.log(`✓ entityMetadata.ts — ${sortedEntities.length} entities, ${Object.keys(enumValues).length} enums`);
console.log(`  → ${outputPath}`);
