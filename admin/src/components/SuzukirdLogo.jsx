export default function SuzukirdLogo({ size = 80 }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width={size} height={size}>

            {/* Outer hexagon */}
            <polygon
                points="40,4 72,22 72,58 40,76 8,58 8,22"
                fill="#1c1c1c"
                stroke="#e8161b"
                strokeWidth="2.5"
            />

            {/* Diagonal speed slash */}
            <line x1="22" y1="28" x2="35" y2="52" stroke="#e8161b" strokeWidth="1.5" strokeLinecap="round" />

            {/* SRD letters */}
            <text
                x="40"
                y="35"
                textAnchor="middle"
                style={{
                    fontFamily: "'Arial Black', Impact, sans-serif",
                    fontWeight: 900,
                    fontSize: 16,
                    letterSpacing: 3,
                    fill: "white",
                }}
            >
                SRD
            </text>

            {/* Red divider line */}
            <line x1="24" y1="40" x2="56" y2="40" stroke="#e8161b" strokeWidth="1" />

            {/* RACING subtitle */}
            <text
                x="40"
                y="53"
                textAnchor="middle"
                style={{
                    fontFamily: "Arial, sans-serif",
                    fontWeight: 400,
                    fontSize: 6.5,
                    letterSpacing: 1.5,
                    fill: "#aaaaaa",
                }}
            >
                RACING
            </text>

        </svg>
    );
}