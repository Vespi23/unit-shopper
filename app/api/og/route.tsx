import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const hasTitle = searchParams.has('title');
        const title = hasTitle
            ? searchParams.get('title')?.slice(0, 100)
            : 'BudgetLynx';

        return new ImageResponse(
            (
                <div
                    style={{
                        background: 'linear-gradient(to bottom right, #f0fdf4, #ecfdf5)',
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: 'sans-serif',
                    }}
                >
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginBottom: 20,
                        }}
                    >
                        {/* Logo Icon mockup */}
                        <div
                            style={{
                                width: 60,
                                height: 60,
                                borderRadius: 12,
                                background: '#059669',
                                marginRight: 20,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontSize: 32,
                                fontWeight: 'bold',
                            }}
                        >
                            $
                        </div>
                        <div
                            style={{
                                fontSize: 60,
                                fontWeight: 900,
                                color: '#064e3b',
                                letterSpacing: '-0.02em',
                            }}
                        >
                            BudgetLynx
                        </div>
                    </div>

                    <div
                        style={{
                            fontSize: 32,
                            fontWeight: 600,
                            color: '#059669',
                            marginBottom: 40,
                            textAlign: 'center',
                            maxWidth: 900,
                        }}
                    >
                        {hasTitle ? `Compare Unit Prices for ${title}` : 'Compare True Unit Prices on Amazon'}
                    </div>

                    {/* Search Bar Visual */}
                    <div
                        style={{
                            background: 'white',
                            border: '1px solid #d1fae5',
                            borderRadius: 24,
                            padding: '16px 32px',
                            display: 'flex',
                            alignItems: 'center',
                            boxShadow: '0 10px 30px -10px rgba(5, 150, 105, 0.2)',
                        }}
                    >
                        <div style={{ color: '#9ca3af', fontSize: 24, marginRight: 16 }}>🔍</div>
                        <div style={{ color: '#374151', fontSize: 24, fontWeight: 500 }}>
                            {hasTitle ? title : 'Search for products...'}
                        </div>
                    </div>
                </div>
            ),
            {
                width: 1200,
                height: 630,
            },
        );
    } catch (e: any) {
        return new Response(`Failed to generate the image`, {
            status: 500,
        });
    }
}
