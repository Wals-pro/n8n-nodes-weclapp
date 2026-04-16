import type { INodeProperties } from 'n8n-workflow';

// REGISTER_RESOURCE: each resource worker adds one import + one spread entry below.
// Keep entries alphabetized. One export per line to minimise merge conflicts.
// Example (do not uncomment — worker adds real import):
// import { articleFields, articleOperations } from './ArticleDescription';
import { productionOrderDescription } from './ProductionOrderDescription';

export const resources: INodeProperties[] = [
	// RESOURCE_ENTRIES_START — workers append here, one line each, alphabetized
	...productionOrderDescription,
	// RESOURCE_ENTRIES_END
];
