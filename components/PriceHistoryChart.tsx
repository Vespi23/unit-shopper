import { Product } from '@/lib/types';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { useMemo, useState, useRef } from 'react';

// Pseudo-random number generator seeded by string
function seededRandom(seed: string) {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = ((hash << 5) - hash) + seed.charCodeAt(i);
        hash |= 0;
    }
    const x = Math.sin(hash) * 10000;
    return x - Math.floor(x);
}

export function PriceHistoryChart({ product }: { product: Product }) {
    const [hoverIndex, setHoverIndex] = useState<number | null>(null);
    const svgRef = useRef<SVGSVGElement>(null);

    const history = useMemo(() => {
        const points = [];
        const basePrice = product.price;
        const volatility = 0.15; // 15% fluctuation
        const seed = product.id;

        // Generate 6 months of data
        for (let i = 5; i >= 0; i--) {
            const random = seededRandom(`${seed}-${i}`);
            // Ensure the last point (i=0) is exactly the current price
            // Historic points fluctuate around basePrice
            const fluctuation = (random - 0.5) * 2 * volatility;
            const price = i === 0 ? basePrice : basePrice * (1 + fluctuation);
            points.push({
                price,
                month: i === 0 ? 'Today' : `${i} mo ago`
            });
        }
        return points;
    }, [product.id, product.price]);

    const prices = history.map(p => p.price);
    const minPrice = Math.min(...prices) * 0.95;
    const maxPrice = Math.max(...prices) * 1.05;
    const range = maxPrice - minPrice;

    // SVG Points
    const width = 300;
    const height = 80; // Increased height for better interaction
    const step = width / (history.length - 1);

    const pointsStr = prices.map((price, i) => {
        const x = i * step;
        const y = height - ((price - minPrice) / range) * height;
        return `${x},${y}`;
    }).join(' ');

    const trend = prices[prices.length - 1] < prices[prices.length - 2] ? 'down' :
        prices[prices.length - 1] > prices[prices.length - 2] ? 'up' : 'flat';

    // Determine color based on trend (Green for down/good, Red for up/bad)
    const trendColor = trend === 'down' ? 'text-emerald-600 dark:text-emerald-400' :
        trend === 'up' ? 'text-red-500 dark:text-red-400' :
            'text-blue-500 dark:text-blue-400';

    const strokeColor = trend === 'down' ? '#10b981' : trend === 'up' ? '#ef4444' : '#3b82f6';
    const areaColor = trend === 'down' ? '#10b981' : trend === 'up' ? '#ef4444' : '#3b82f6';

    const Icon = trend === 'down' ? TrendingDown : trend === 'up' ? TrendingUp : Minus;
    const text = trend === 'down' ? "Price has dropped recently!" :
        trend === 'up' ? "Price is rising." :
            "Price is stable.";

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!svgRef.current) return;
        const rect = svgRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;

        // Find closest point
        let closest = 0;
        let minDiff = Infinity;

        history.forEach((_, i) => {
            const pointX = i * step;
            const diff = Math.abs(x - pointX);
            if (diff < minDiff) {
                minDiff = diff;
                closest = i;
            }
        });

        setHoverIndex(closest);
    };

    const handleMouseLeave = () => {
        setHoverIndex(null);
    };

    const activePoint = hoverIndex !== null ? history[hoverIndex] : null;
    const activeX = hoverIndex !== null ? hoverIndex * step : 0;
    const activeY = activePoint ? height - ((activePoint.price - minPrice) / range) * height : 0;

    return (
        <div className="flex-1 min-h-[140px] rounded-xl bg-card border border-border p-4 flex flex-col justify-between group shadow-sm select-none">
            <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-bold flex items-center gap-2 ${trendColor}`}>
                    <Icon className="w-4 h-4" /> {text}
                </span>
                <span className="text-xs text-muted-foreground">6 Month Trend</span>
            </div>

            <div className="relative h-[80px] w-full mt-auto cursor-crosshair"
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            >
                {/* Tooltip */}
                {hoverIndex !== null && activePoint && (
                    <div
                        className="absolute z-20 bg-popover text-popover-foreground text-xs rounded-md px-2 py-1 shadow-md border border-border pointer-events-none transform -translate-x-1/2 whitespace-nowrap"
                        style={{
                            left: activeX,
                            top: -30
                        }}
                    >
                        <div className="font-bold">${activePoint.price.toFixed(2)}</div>
                        <div className="text-[10px] text-muted-foreground">{activePoint.month}</div>
                    </div>
                )}

                <svg
                    ref={svgRef}
                    width="100%"
                    height="100%"
                    viewBox={`0 0 ${width} ${height}`}
                    preserveAspectRatio="none"
                    className="overflow-visible"
                >
                    {/* Gradient Defs */}
                    <defs>
                        <linearGradient id={`gradient-${product.id}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={areaColor} stopOpacity="0.2" />
                            <stop offset="100%" stopColor={areaColor} stopOpacity="0" />
                        </linearGradient>
                    </defs>

                    {/* Area */}
                    <path
                        d={`M0,${height} ${pointsStr} L${width},${height} Z`}
                        fill={`url(#gradient-${product.id})`}
                    />

                    {/* Line */}
                    <polyline
                        points={pointsStr}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />

                    {/* All Points (Invisible hit targets) */}
                    {prices.map((price, i) => (
                        <circle
                            key={i}
                            cx={i * step}
                            cy={height - ((price - minPrice) / range) * height}
                            r="4"
                            fill="transparent"
                        />
                    ))}

                    {/* Active Point Highlight */}
                    {hoverIndex !== null && (
                        <>
                            <line
                                x1={activeX}
                                y1="0"
                                x2={activeX}
                                y2={height}
                                stroke="currentColor"
                                strokeWidth="1"
                                strokeDasharray="4 2"
                                className="text-muted-foreground/50 opacity-50 transition-opacity"
                            />
                            <circle
                                cx={activeX}
                                cy={activeY}
                                r="5"
                                fill={areaColor}
                                stroke="white"
                                strokeWidth="2"
                                className="transition-all duration-75"
                            />
                        </>
                    )}

                    {/* Current Price Dot (Only show if not hovering, or if hovering last point) */}
                    {hoverIndex === null && (
                        <circle
                            cx={width}
                            cy={height - ((prices[prices.length - 1] - minPrice) / range) * height}
                            r="4"
                            fill={strokeColor}
                            className="animate-pulse"
                        />
                    )}
                </svg>
            </div>

            <div className="flex justify-between mt-2 text-[10px] text-muted-foreground font-medium pointer-events-none">
                <span>6 mo ago</span>
                <span>Today</span>
            </div>
        </div>
    );
}
