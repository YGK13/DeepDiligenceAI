// ============================================================
// OG Image Route — Dynamic Open Graph image generation
// Renders a branded 1200x630 image for social sharing previews
// Used by LinkedIn, Twitter/X, Slack, Discord, iMessage, etc.
// ============================================================
import { ImageResponse } from 'next/og';

// ============================================================
// EDGE RUNTIME — Fast cold starts, global distribution
// OG images must render quickly for social crawlers
// ============================================================
export const runtime = 'edge';

// ============================================================
// GET — Generate the OG image on demand
// Returns a PNG image response at 1200x630px
// ============================================================
export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          // ============ FULL-BLEED DARK BACKGROUND WITH GRADIENT ============
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          // Radial gradient: subtle blue glow from center on dark base
          background:
            'radial-gradient(ellipse 80% 60% at 50% 40%, #1a2744 0%, #0f1117 70%)',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          padding: '60px',
        }}
      >
        {/* ============ LOGO / BRAND NAME ============ */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            marginBottom: '24px',
          }}
        >
          {/* "Due" in brand blue */}
          <span
            style={{
              fontSize: '72px',
              fontWeight: 800,
              color: '#4a7dff',
              letterSpacing: '-1px',
            }}
          >
            Due
          </span>
          {/* "Drill" in white */}
          <span
            style={{
              fontSize: '72px',
              fontWeight: 800,
              color: '#ffffff',
              letterSpacing: '-1px',
            }}
          >
            Drill
          </span>
        </div>

        {/* ============ TAGLINE ============ */}
        <div
          style={{
            fontSize: '32px',
            fontWeight: 500,
            color: '#e0e0e0',
            marginBottom: '48px',
            textAlign: 'center',
          }}
        >
          Research Any Startup in 60 Seconds
        </div>

        {/* ============ STATS ROW — Key platform numbers ============ */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '40px',
            marginBottom: '48px',
          }}
        >
          {/* Stat: DD Categories */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontSize: '40px',
                fontWeight: 700,
                color: '#4a7dff',
              }}
            >
              16
            </span>
            <span
              style={{
                fontSize: '16px',
                fontWeight: 500,
                color: '#8899aa',
                marginTop: '4px',
              }}
            >
              DD Categories
            </span>
          </div>

          {/* Divider dot */}
          <div
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#4a7dff',
            }}
          />

          {/* Stat: Data Fields */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontSize: '40px',
                fontWeight: 700,
                color: '#4a7dff',
              }}
            >
              214
            </span>
            <span
              style={{
                fontSize: '16px',
                fontWeight: 500,
                color: '#8899aa',
                marginTop: '4px',
              }}
            >
              Data Fields
            </span>
          </div>

          {/* Divider dot */}
          <div
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: '#4a7dff',
            }}
          />

          {/* Stat: AI Providers */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontSize: '40px',
                fontWeight: 700,
                color: '#4a7dff',
              }}
            >
              4
            </span>
            <span
              style={{
                fontSize: '16px',
                fontWeight: 500,
                color: '#8899aa',
                marginTop: '4px',
              }}
            >
              AI Providers
            </span>
          </div>
        </div>

        {/* ============ BOTTOM DOMAIN URL ============ */}
        <div
          style={{
            fontSize: '20px',
            fontWeight: 500,
            color: '#556677',
            letterSpacing: '2px',
          }}
        >
          duedrill.com
        </div>
      </div>
    ),
    {
      // ============ IMAGE DIMENSIONS — Standard OG size ============
      width: 1200,
      height: 630,
    }
  );
}
