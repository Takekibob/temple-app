import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "てらログ - お寺DXアプリ";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#faf7f2",
          backgroundImage:
            "radial-gradient(circle at 20% 80%, #d97706 0%, transparent 40%), radial-gradient(circle at 80% 20%, #92400e 0%, transparent 40%)",
        }}
      >
        {/* Logo area */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <div style={{ fontSize: 96, lineHeight: 1 }}>🏛</div>
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: "#292524",
              letterSpacing: "-2px",
            }}
          >
            てらログ
          </div>
          <div
            style={{
              fontSize: 32,
              color: "#78716c",
              marginTop: "8px",
            }}
          >
            お寺DX管理アプリ
          </div>
        </div>

        {/* Tagline chips */}
        <div
          style={{
            display: "flex",
            gap: "16px",
            marginTop: "48px",
          }}
        >
          {["法要予約", "会員管理", "イベント参加"].map((label) => (
            <div
              key={label}
              style={{
                padding: "10px 24px",
                backgroundColor: "#92400e",
                color: "white",
                borderRadius: "999px",
                fontSize: "24px",
                fontWeight: 600,
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    size
  );
}
