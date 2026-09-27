'use client';

interface LogoProps {
    className?: string;
    width?: number;
    height?: number;
}

export default function Logo({ className = '', width = 200, height = 80 }: LogoProps) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={width}
            height={height}
            viewBox="0 0 600 200"
            className={className}
            style={{ overflow: 'visible' }}
        >
            <defs>
                {/* Colorful sky blue gradient */}
                <linearGradient id="grad" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0%" stopColor="#0EA5E9" />
                    <stop offset="30%" stopColor="#38BDF8" />
                    <stop offset="65%" stopColor="#06B6D4" />
                    <stop offset="100%" stopColor="#14B8A6" />
                </linearGradient>

                {/* Soft glow */}
                <radialGradient id="glow" cx="50%" cy="40%" r="60%">
                    <stop offset="0%" stopColor="white" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="transparent" />
                </radialGradient>

                {/* Shadow */}
                <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="8" stdDeviation="14" floodOpacity="0.18" />
                </filter>

                {/* Text gradient */}
                <linearGradient id="textGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#0EA5E9" />
                    <stop offset="50%" stopColor="#06B6D4" />
                    <stop offset="100%" stopColor="#14B8A6" />
                </linearGradient>
            </defs>

            {/* ICON - Minimal left padding */}
            <g transform="translate(10,20)">
                {/* Glow */}
                <circle cx="80" cy="80" r="70" fill="#0EA5E9" />

                {/* Gradient orb */}
                <circle cx="80" cy="80" r="65" fill="url(#grad)" filter="url(#shadow)" />

                {/* Creative travel symbol */}
                <g fill="white">
                    {/* Curved path (travel motion) */}
                    <path
                        d="M40 110c25-20 55-20 80-5"
                        stroke="white"
                        strokeWidth="10"
                        fill="none"
                        strokeLinecap="round"
                        opacity="0.9"
                    />

                    {/* Pin outline */}
                    <path
                        d="M80 40c-22 0-40 18-40 40 0 30 40 70 40 70s40-40 40-70c0-22-18-40-40-40zm0 58a18 18 0 1 1 0-36 18 18 0 0 1 0 36z"
                        fill="white"
                        fillOpacity="0.95"
                    />
                </g>
            </g>

            {/* TEXT ON RIGHT - Colorful */}
            <text
                x="200"
                y="95"
                fontFamily="Poppins, Segoe UI, Roboto, sans-serif"
                fontSize="70"
                fontWeight="700"
                fill="#0EA5E9"
            >
                TourBnT
            </text>

            {/* Sub tagline - Sky Blue */}
            <text
                x="200"
                y="155"
                fontFamily="Poppins, Segoe UI, Roboto, sans-serif"
                fontSize="40"
                fontWeight="600"
                fill="#0EA5E9"
            >
                Book And Travel
            </text>
        </svg>
    );
}
