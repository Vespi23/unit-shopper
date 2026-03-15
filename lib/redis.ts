// Stubbed out to remove Redis dependency. 
// These functions safely return empty data to prevent app crashes.

export const redis = {
    get: async () => null,
    set: async () => null,
    on: () => {},
    connect: async () => {},
    isOpen: false
};

export async function getPrefs(key: string): Promise<Record<string, string>> {
    return {};
}

export async function updatePrefs(key: string, prefs: Record<string, string>) {
    // No-op: Do nothing since Redis is removed.
    return;
}