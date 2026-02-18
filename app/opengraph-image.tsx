import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export const alt = 'BudgetLynx - Amazon Unit Price Search'
export const size = {
    width: 1200,
    height: 630,
}

export const contentType = 'image/png'

export default async function Image() {
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
                        maxWidth: 800,
                    }}
                >
                    Compare True Unit Prices on Amazon
                </div>

                {/* Mock Search Bar */}
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
                    <div style={{ color: '#d1d5db', fontSize: 24 }}>Search for "Peanut Butter"...</div>
                </div>
            </div>
        ),
        {
            ...size,
        }
    )
}
