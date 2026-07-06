// scripts/ingest.js
const { createClient } = require('@sanity/client');
const crypto = require('crypto');

// Initialize the production database engine client
const workerClient = createClient({
  projectId: '7st9no77',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
});

// 40 High-Volume, unit-price sensitive seed categories
const productSeeds = [
  "dog food", "cat food", "toilet paper", "paper towels", "coffee beans", 
  "protein powder", "laundry detergent", "baby wipes", "diapers", "trash bags",
  "olive oil", "almonds", "whey protein", "k cups", "cat litter",
  "dish soap", "shampoo", "conditioner", "hand soap", "batteries aa",
  "batteries aaa", "printer paper", "chia seeds", "flax seeds", "oats",
  "rice", "beans", "canned tuna", "peanut butter", "honey",
  "maple syrup", "apple cider vinegar", "coconut oil", "sea salt", "black pepper",
  "garbage bags", "foil", "parchment paper", "zip bags", "napkins"
];

// 50 High-Intent transactional pSEO search modifiers
const searchModifiers = [
  "price per pound", "cost per ounce", "bulk wholesale price", "best price per unit",
  "lowest price per count", "value pack pricing", "price breakdown", "cost comparison",
  "wholesale per ounce", "bulk buy metrics", "amazon price per count", "unit value matrix",
  "cheapest per lb", "case price analysis", "size cost efficiency", "pack distribution value",
  "per item baseline", "economical bulk size", "smart shopper cost", "volume discount tier",
  "price verification", "retail unit index", "net weight cost", "oz cost optimization",
  "fluid ounce breakdown", "cost per sheet", "price per roll", "wholesale price per kg",
  "bulk savings analysis", "unit price tracking", "lowest cost per single item",
  "value breakdown matrix", "per fluid ounce baseline", "price per count evaluation",
  "bulk acquisition metrics", "wholesale value guide", "commercial pack price",
  "price verification index", "unit cost optimization model", "lowest wholesale rate",
  "bulk value threshold", "retail price per unit breakdown", "cost efficiency comparison",
  "per serving price baseline", "wholesale case price comparison", "bulk unit cost metric",
  "amazon cost per ounce tracker", "cheapest bulk price point", "price check per pound",
  "optimized unit value"
];

// Pack sizes to mathematically scale the configuration list up to 10,000
const packSizes = [12, 24, 36, 48, 64];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runMassIngestion() {
  console.log("==> Initializing mathematical pipeline generation for 10,000 records...");
  
  const generatedKeywords = [];
  
  // Phase 1: Generate the base combinations (40 * 50 = 2,000 items)
  for (const product of productSeeds) {
    for (const modifier of searchModifiers) {
      generatedKeywords.push(`${product} ${modifier}`);
    }
  }

  // Phase 2: Expand with pack variations to cleanly hit exactly 10,000 items
  let packIdx = 0;
  let modifierIdx = 0;
  let productIdx = 0;

  while (generatedKeywords.length < 10000) {
    const product = productSeeds[productIdx % productSeeds.length];
    const modifier = searchModifiers[modifierIdx % searchModifiers.length];
    const pack = packSizes[packIdx % packSizes.length];

    const structuralVariation = `bulk ${product} ${pack} pack ${modifier}`;
    generatedKeywords.push(structuralVariation);

    // Increment indices smoothly to diversify terms
    productIdx++;
    if (productIdx % productSeeds.length === 0) {
      modifierIdx++;
      if (modifierIdx % searchModifiers.length === 0) {
        packIdx++;
      }
    }
  }

  // Final trim safeguard to match your index footprint exactly
  const targetPayloadList = generatedKeywords.slice(0, 10000);
  console.log(`==> Generation complete. Structural array locked at: ${targetPayloadList.length} items.`);

  const BATCH_SIZE = 500;
  let currentBatch = workerClient.transaction();
  let mutationCount = 0;

  for (let i = 0; i < targetPayloadList.length; i++) {
    const rawPhrase = targetPayloadList[i];
    const cleanSlug = rawPhrase.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    // Create a deterministic hash key to completely block dataset duplicates
    const deterministicId = `pseo-${crypto.createHash('md5').update(cleanSlug).digest('hex')}`;

    const doc = {
      _type: 'productQuery',
      _id: deterministicId,
      keywordValue: rawPhrase,
      keywordSlug: cleanSlug,
      _createdAt: new Date().toISOString(),
    };

    currentBatch.createOrReplace(doc);
    mutationCount++;

    // When a batch hits its 500 limit, commit the transaction and flush the queue
    if (mutationCount % BATCH_SIZE === 0 || i === targetPayloadList.length - 1) {
      try {
        await currentBatch.commit();
        console.log(`[COMMITTED]: Batch block up to index ${i} (${mutationCount} total docs uploaded)`);
        
        // Cooldown pause to prevent API rate-limiting blocks
        await sleep(250);
        currentBatch = workerClient.transaction();
      } catch (err) {
        console.error(`[CRITICAL FAILURE] Pipeline transaction aborted at index ${i}:`, err.message);
        process.exit(1);
      }
    }
  }

  console.log("\n[SUCCESS]: All 10,000 unique pSEO keyword vectors saved to Sanity Production.");
}

// Runtime check to protect write security
if (!process.env.SANITY_WRITE_TOKEN) {
  console.error("Execution Aborted: Missing active SANITY_WRITE_TOKEN environment variable.");
  process.exit(1);
}

runMassIngestion();