// seed-programmatic-keywords.js
// Execution on Windows PowerShell: node seed-programmatic-keywords.js
const { createClient } = require('@sanity/client');
const { loadEnvConfig } = require('@next/env');

// Automatically extract environment variables from your local Next.js environment profile
const projectDir = process.cwd();
loadEnvConfig(projectDir);

const WRITE_TOKEN = process.env.SANITY_WRITE_TOKEN;
const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';

if (!WRITE_TOKEN) {
  console.error('[ERROR] Execution halted: SANITY_WRITE_TOKEN is missing from your environment.');
  process.exit(1);
}

if (!PROJECT_ID) {
  console.error('[ERROR] Execution halted: NEXT_PUBLIC_SANITY_PROJECT_ID could not be resolved from environment configuration files.');
  process.exit(1);
}

const sanityClient = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  token: WRITE_TOKEN,
  useCdn: false, // Write directly to the primary data store
  apiVersion: '2026-06-09'
});

const incomingKeywords = [
  'celsius energy drink 12 pack',
  '4c energy rush packets',
  'whey protein powder bulk',
  'unsweetened almond milk shelf stable',
  'protein bars 24 count savings',
  'zero sugar soda cans bulk'
];

async function ingestKeywordsPipeline() {
  console.log(`Targeting Sanity Project ID: ${PROJECT_ID}`);
  console.log(`Preparing atomic ingestion transaction for ${incomingKeywords.length} records...\n`);

  // Initialize an atomic transaction loop
  let transaction = sanityClient.transaction();

  for (const keyword of incomingKeywords) {
    const cleanKeyword = keyword.trim().toLowerCase();
    const calculatedSlug = cleanKeyword.replace(/\s+/g, '-');
    const documentId = `programmatic-query-${calculatedSlug}`;

    const documentPayload = {
      _id: documentId,
      _type: 'productQuery',
      keyword: cleanKeyword,
      slug: {
        _type: 'slug',
        current: calculatedSlug
      },
      lastUpdated: new Date().toISOString()
    };

    // Queue creation payload into the atomic transaction buffer
    transaction.createOrReplace(documentPayload);
  }

  try {
    // Commit all queued updates simultaneously in a single network operation
    const result = await transaction.commit();
    console.log(`[SUCCESS] Atomic pipeline committed safely. Transaction ID: ${result.transactionId}`);
    console.log(`Synchronized ${incomingKeywords.length} nodes to your Sanity data store.`);
  } catch (err) {
    console.error('[CRITICAL FAULT] Failed to commit mutation transaction payload:', err.message);
  }
}

ingestKeywordsPipeline();