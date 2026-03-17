import { useEffect, useState } from 'react';
import { ExperimentId, VariantId, getBucket } from '@/lib/ab-testing';
import { track } from '@vercel/analytics/react';

// MODULE-LEVEL CACHE: Survives component re-renders and shares state across all 40 ProductCards
const trackedExperiments = new Set<string>();
const bucketCache = new Map<ExperimentId, VariantId>();

export function useABTest(experimentId: ExperimentId) {
    const [variant, setVariant] = useState<VariantId>('control');
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
        
        // 1. O(1) Memory Cache Lookup (Prevents reading Cookies/LocalStorage 40 times)
        let bucket = bucketCache.get(experimentId);
        if (!bucket) {
            bucket = getBucket(experimentId);
            bucketCache.set(experimentId, bucket);
        }
        
        setVariant(bucket);

        // 2. Prevent API Spam: Only track the view ONCE per page load, even if 40 cards mount
        if (!trackedExperiments.has(experimentId)) {
            trackedExperiments.add(experimentId);
            
            if (process.env.NODE_ENV === 'production') {
                track('Experiment Viewed', {
                    experiment: experimentId,
                    variant: bucket
                });
            } else {
                console.log(`[A/B] Viewed ${experimentId}: ${bucket}`);
            }
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