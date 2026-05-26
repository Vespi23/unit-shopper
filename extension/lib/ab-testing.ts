export type ExperimentId = 'cta_color';
export type VariantId = 'control' | 'variant_b';

export interface Experiment {
    id: ExperimentId;
    variants: VariantId[];
}

export const EXPERIMENTS: Record<ExperimentId, Experiment> = {
    cta_color: {
        id: 'cta_color',
        variants: ['control', 'variant_b']
    }
};

const COOKIE_NAME = 'ab_tests';

export function getBucket(experimentId: ExperimentId): VariantId {
    if (typeof window === 'undefined') return 'control';

    try {
        const cookies = parseCookies(document.cookie);
        const saved = cookies[COOKIE_NAME] ? JSON.parse(decodeURIComponent(cookies[COOKIE_NAME])) : {};

        if (saved[experimentId]) {
            return saved[experimentId] as VariantId;
        }

        // Assign new bucket
        const weights = [0.5, 0.5]; // 50/50 split
        const random = Math.random();
        const variant = random < weights[0] ? 'control' : 'variant_b';

        saved[experimentId] = variant;
        document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(saved))}; path=/; max-age=31536000; SameSite=Lax`;

        return variant;
    } catch (err) {
        console.error("A/B Cookie Error", err);
        return 'control';
    }
}

// Simple cookie parser helper
function parseCookies(cookieString: string): Record<string, string> {
    return cookieString
        .split(';')
        .reduce((res, c) => {
            const [key, val] = c.trim().split('=').map(decodeURIComponent);
            try {
                return Object.assign(res, { [key]: val });
            } catch (e) {
                return res;
            }
        }, {});
}
