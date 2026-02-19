import { useEffect, useState } from 'react';
import { ExperimentId, VariantId, getBucket } from '@/lib/ab-testing';
import { track } from '@vercel/analytics/react';

export function useABTest(experimentId: ExperimentId) {
    const [variant, setVariant] = useState<VariantId>('control');
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
        const bucket = getBucket(experimentId);
        setVariant(bucket);

        // Track experiment view
        // We defer this slightly to ensure we don't spam if component re-mounts quickly
        // or we could use a ref to track if verified sent.
        // For simplicity, we just track.
        if (process.env.NODE_ENV === 'production') {
            track('Experiment Viewed', {
                experiment: experimentId,
                variant: bucket
            });
        } else {
            console.log(`[A/B] Viewed ${experimentId}: ${bucket}`);
        }
    }, [experimentId]);

    const trackConversion = (eventName: string, metadata?: Record<string, any>) => {
        if (process.env.NODE_ENV === 'production') {
            track(eventName, {
                experiment: experimentId,
                variant: variant,
                ...metadata
            });
        } else {
            console.log(`[A/B] Conversion '${eventName}' for ${experimentId}:${variant}`, metadata);
        }
    };

    return { variant, trackConversion, isReady: isClient };
}
