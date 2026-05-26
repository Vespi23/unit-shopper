// sanity/sanity.cli.ts
import { defineCliConfig } from 'sanity/cli';

export default defineCliConfig({
  api: {
    projectId: '7st9no77',   // Explicitly hardcoded to bypass PowerShell scope blocks
    dataset: 'production',   // Explicitly hardcoded target dataset
  }
});