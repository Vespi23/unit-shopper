// sanity/sanity.cli.ts
import { defineCliConfig } from 'sanity/cli';

export default defineCliConfig({
  api: {
    projectId: '7st9no77',   // Explicitly hardcoded to bypass PowerShell scope blocks[cite: 1]
    dataset: 'production',   // Explicitly hardcoded target dataset[cite: 1]
  },
  vite: (config) => {
    return {
      ...config,
      plugins: (config.plugins || []).map((plugin: any) => {
        // Intercept the broken builtin refresh wrapper causing the moduleType crash
        if (plugin?.name === 'builtin:vite-react-refresh-wrapper') {
          return {
            ...plugin,
            transform(code: string, id: any) {
              // Extract string path if passed as an object metadata reference by Vite 7
              const stabilizedId = typeof id === 'object' ? (id.id || String(id)) : id;
              return plugin.transform.call(this, code, stabilizedId);
            }
          };
        }
        return plugin;
      })
    };
  }
});