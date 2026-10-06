import React from 'react';

export default function PassionGoIsometricGraphic() {
  return (
    <div className="relative w-full max-w-[620px] aspect-[16/11] select-none mx-auto flex items-center justify-center">
      {/* Background ambient lighting glow */}
      <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/10 via-amber-400/10 to-transparent rounded-full filter blur-3xl -z-10 pointer-events-none" />
      
      <svg
        viewBox="0 0 800 560"
        className="w-full h-full drop-shadow-xl overflow-visible"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Gradients for isometric shading */}
          <linearGradient id="pg-building-front" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#EDE9FE" />
          </linearGradient>

          <linearGradient id="pg-building-side" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#DDD6FE" />
            <stop offset="100%" stopColor="#C4B5FD" />
          </linearGradient>

          <linearGradient id="pg-building-roof" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FAF5FF" />
            <stop offset="100%" stopColor="#F3E8FF" />
          </linearGradient>

          <linearGradient id="pg-purple-brand" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7E22CE" />
            <stop offset="100%" stopColor="#581C87" />
          </linearGradient>

          <linearGradient id="pg-yellow-brand" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="100%" stopColor="#EAB308" />
          </linearGradient>

          <linearGradient id="pg-conveyor-belt" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="100%" stopColor="#1E293B" />
          </linearGradient>

          <linearGradient id="pg-globe-glow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F3E8FF" />
            <stop offset="50%" stopColor="#E9D5FF" />
            <stop offset="100%" stopColor="#D8B4FE" />
          </linearGradient>

          <filter id="pg-soft-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="18" stdDeviation="16" floodColor="#4C1D95" floodOpacity="0.15" />
          </filter>
        </defs>

        {/* --- BASE PLATFORM FLOOR --- */}
        <g filter="url(#pg-soft-shadow)">
          {/* Main isometric floor slab */}
          <polygon
            points="400,120 740,290 400,500 60,330"
            fill="#F8FAFC"
            stroke="#E2E8F0"
            strokeWidth="1.5"
          />
          {/* Slab edge */}
          <polygon
            points="60,330 400,500 400,518 60,348"
            fill="#CBD5E1"
          />
          <polygon
            points="400,500 740,290 740,308 400,518"
            fill="#94A3B8"
          />
        </g>

        {/* Floor markings & grid */}
        <g opacity="0.35">
          <line x1="200" y1="245" x2="540" y2="415" stroke="#9333EA" strokeWidth="1.5" strokeDasharray="6 6" />
          <line x1="260" y1="215" x2="600" y2="385" stroke="#EAB308" strokeWidth="1.5" strokeDasharray="6 6" />
          <line x1="230" y1="415" x2="570" y2="245" stroke="#CBD5E1" strokeWidth="1" />
        </g>

        {/* --- MAIN WAREHOUSE / LOGISTICS BUILDING --- */}
        <g id="warehouse-building">
          {/* Building Left/Front Wall */}
          <polygon
            points="430,140 660,255 660,400 430,285"
            fill="url(#pg-building-front)"
            stroke="#E9D5FF"
            strokeWidth="1"
          />

          {/* Building Right Wall */}
          <polygon
            points="660,255 725,222 725,367 660,400"
            fill="url(#pg-building-side)"
            stroke="#DDD6FE"
            strokeWidth="1"
          />

          {/* Building Roof */}
          <polygon
            points="430,140 500,105 725,222 660,255"
            fill="url(#pg-building-roof)"
            stroke="#E9D5FF"
            strokeWidth="1.5"
          />

          {/* Purple Top Fascia Trim */}
          <polygon
            points="430,140 660,255 660,265 430,150"
            fill="url(#pg-purple-brand)"
          />
          <polygon
            points="660,255 725,222 725,232 660,265"
            fill="#581C87"
          />

          {/* Yellow Highlight Stripe on Roof edge */}
          <polygon
            points="430,138 660,253 662,254 432,139"
            fill="url(#pg-yellow-brand)"
          />

          {/* --- BRAND SIGN ON BUILDING: "Passion Go" --- */}
          <g transform="translate(460, 195) skewY(26.5) scale(0.95, 0.9)">
            {/* Logo Emblem Icon */}
            <g transform="translate(0, 0)">
              <rect x="0" y="0" width="22" height="22" rx="5" fill="url(#pg-purple-brand)" />
              <path d="M5 11 L10 6 L17 13 M10 6 L10 16" stroke="#FDE047" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </g>
            {/* Text Passion Go */}
            <text
              x="28"
              y="16"
              fill="#3B0764"
              fontFamily="system-ui, -apple-system, sans-serif"
              fontWeight="900"
              fontSize="20"
              letterSpacing="-0.5"
            >
              Passion <tspan fill="#EAB308">Go</tspan>
            </text>
          </g>

          {/* Building Windows (Modern architectural glass slats) */}
          <g transform="translate(540, 240) skewY(26.5)">
            <rect x="0" y="0" width="16" height="42" rx="2" fill="#C4B5FD" opacity="0.8" />
            <rect x="22" y="0" width="16" height="42" rx="2" fill="#C4B5FD" opacity="0.8" />
            <rect x="44" y="0" width="16" height="42" rx="2" fill="#C4B5FD" opacity="0.8" />
            <rect x="66" y="0" width="16" height="42" rx="2" fill="#C4B5FD" opacity="0.8" />
          </g>

          {/* --- LOADING BAYS / DOCKS --- */}
          {/* Dock 1 */}
          <g transform="translate(595, 330) skewY(26.5)">
            <rect x="0" y="0" width="28" height="40" rx="2" fill="#1E293B" />
            <rect x="2" y="2" width="24" height="36" fill="#334155" />
            {/* Shutter lines */}
            <line x1="2" y1="10" x2="26" y2="10" stroke="#475569" strokeWidth="1" />
            <line x1="2" y1="18" x2="26" y2="18" stroke="#475569" strokeWidth="1" />
            <line x1="2" y1="26" x2="26" y2="26" stroke="#475569" strokeWidth="1" />
            <line x1="2" y1="34" x2="26" y2="34" stroke="#475569" strokeWidth="1" />
            {/* Dock Number */}
            <circle cx="14" cy="6" r="3" fill="#FACC15" />
          </g>

          {/* Dock 2 */}
          <g transform="translate(632, 348) skewY(26.5)">
            <rect x="0" y="0" width="28" height="40" rx="2" fill="#1E293B" />
            <rect x="2" y="2" width="24" height="36" fill="#334155" />
            <line x1="2" y1="10" x2="26" y2="10" stroke="#475569" strokeWidth="1" />
            <line x1="2" y1="18" x2="26" y2="18" stroke="#475569" strokeWidth="1" />
            <line x1="2" y1="26" x2="26" y2="26" stroke="#475569" strokeWidth="1" />
            <line x1="2" y1="34" x2="26" y2="34" stroke="#475569" strokeWidth="1" />
            <circle cx="14" cy="6" r="3" fill="#FACC15" />
          </g>
        </g>

        {/* --- DELIVERY VAN AT THE DOCK --- */}
        <g id="delivery-van" transform="translate(625, 330)">
          {/* Shadow under van */}
          <polygon points="10,65 95,20 120,30 35,78" fill="#1E1B4B" opacity="0.3" filter="blur(3px)" />

          {/* Van Body (Isometric 3D) */}
          {/* Left Side */}
          <polygon points="15,45 80,12 80,48 15,80" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="0.8" />
          {/* Van Yellow accent stripe */}
          <polygon points="15,62 80,30 80,36 15,68" fill="url(#pg-yellow-brand)" />
          {/* Van Purple accent stripe */}
          <polygon points="15,68 80,36 80,40 15,72" fill="url(#pg-purple-brand)" />
          
          {/* "Passion Go" small logo on van side */}
          <text x="32" y="60" transform="skewY(-26.5)" fill="#581C87" fontSize="5.5" fontWeight="900" fontFamily="sans-serif">
            PASSION GO
          </text>

          {/* Van Roof */}
          <polygon points="15,45 40,32 105,-1 80,12" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="0.8" />
          {/* Van Cabin Front */}
          <polygon points="80,12 105,-1 105,35 80,48" fill="#EDE9FE" stroke="#E2E8F0" strokeWidth="0.8" />
          {/* Windshield */}
          <polygon points="82,14 100,5 100,20 82,29" fill="#38BDF8" opacity="0.75" />
          {/* Wheels */}
          <ellipse cx="32" cy="78" rx="6" ry="9" fill="#1E293B" stroke="#475569" strokeWidth="1.5" />
          <ellipse cx="68" cy="60" rx="6" ry="9" fill="#1E293B" stroke="#475569" strokeWidth="1.5" />
          <circle cx="32" cy="78" r="2.5" fill="#E2E8F0" />
          <circle cx="68" cy="60" r="2.5" fill="#E2E8F0" />
        </g>

        {/* --- DELIVERY MOTORBIKES / SCOOTERS FLEET --- */}
        <g id="fleet-scooters" transform="translate(565, 380)">
          {/* Scooter 1 */}
          <g transform="translate(0, 0)">
            <ellipse cx="20" cy="30" rx="14" ry="6" fill="#1E1B4B" opacity="0.25" />
            {/* Yellow / Purple Motorbike */}
            <polygon points="12,18 22,12 28,15 18,22" fill="#EAB308" />
            <polygon points="10,22 18,22 16,30 8,30" fill="#6B21A8" />
            {/* Delivery Box on rear */}
            <polygon points="5,15 14,10 14,20 5,25" fill="#FACC15" stroke="#CA8A04" strokeWidth="0.5" />
            <polygon points="5,15 11,8 20,13 14,20" fill="#FEF08A" />
            <text x="6" y="21" transform="skewY(26.5)" fill="#581C87" fontSize="3.5" fontWeight="900">PG</text>
            {/* Wheels */}
            <ellipse cx="8" cy="30" rx="3" ry="5" fill="#1E293B" />
            <ellipse cx="22" cy="22" rx="3" ry="5" fill="#1E293B" />
          </g>

          {/* Scooter 2 */}
          <g transform="translate(18, 9)">
            <ellipse cx="20" cy="30" rx="14" ry="6" fill="#1E1B4B" opacity="0.25" />
            <polygon points="12,18 22,12 28,15 18,22" fill="#EAB308" />
            <polygon points="10,22 18,22 16,30 8,30" fill="#6B21A8" />
            <polygon points="5,15 14,10 14,20 5,25" fill="#FACC15" stroke="#CA8A04" strokeWidth="0.5" />
            <polygon points="5,15 11,8 20,13 14,20" fill="#FEF08A" />
            <text x="6" y="21" transform="skewY(26.5)" fill="#581C87" fontSize="3.5" fontWeight="900">PG</text>
            <ellipse cx="8" cy="30" rx="3" ry="5" fill="#1E293B" />
            <ellipse cx="22" cy="22" rx="3" ry="5" fill="#1E293B" />
          </g>

          {/* Scooter 3 */}
          <g transform="translate(36, 18)">
            <ellipse cx="20" cy="30" rx="14" ry="6" fill="#1E1B4B" opacity="0.25" />
            <polygon points="12,18 22,12 28,15 18,22" fill="#EAB308" />
            <polygon points="10,22 18,22 16,30 8,30" fill="#6B21A8" />
            <polygon points="5,15 14,10 14,20 5,25" fill="#FACC15" stroke="#CA8A04" strokeWidth="0.5" />
            <polygon points="5,15 11,8 20,13 14,20" fill="#FEF08A" />
            <text x="6" y="21" transform="skewY(26.5)" fill="#581C87" fontSize="3.5" fontWeight="900">PG</text>
            <ellipse cx="8" cy="30" rx="3" ry="5" fill="#1E293B" />
            <ellipse cx="22" cy="22" rx="3" ry="5" fill="#1E293B" />
          </g>
        </g>

        {/* --- HOLOGRAPHIC CENTRAL LOGISTICS GLOBE --- */}
        <g id="globe-center" transform="translate(350, 310)">
          {/* Globe floor pedestal */}
          <ellipse cx="0" cy="45" rx="55" ry="24" fill="#DDD6FE" stroke="#C4B5FD" strokeWidth="1.5" />
          <ellipse cx="0" cy="42" rx="46" ry="18" fill="#EDE9FE" />
          
          {/* Ambient ground shadow */}
          <ellipse cx="0" cy="45" rx="42" ry="16" fill="#6B21A8" opacity="0.2" filter="blur(4px)" />

          {/* Main sphere */}
          <circle cx="0" cy="0" r="48" fill="url(#pg-globe-glow)" stroke="#A855F7" strokeWidth="1.5" />

          {/* Longitude and Latitude grid on globe */}
          <ellipse cx="0" cy="0" rx="47" ry="22" fill="none" stroke="#7E22CE" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
          <ellipse cx="0" cy="0" rx="24" ry="47" fill="none" stroke="#7E22CE" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
          <line x1="-48" y1="0" x2="48" y2="0" stroke="#7E22CE" strokeWidth="1.2" opacity="0.5" />

          {/* Continents outlines stylized in vibrant purple/yellow dots */}
          <path
            d="M-22,-18 Q-10,-24 4,-16 Q15,-10 8,5 Q0,18 -16,10 Q-28,4 -22,-18 Z"
            fill="#9333EA"
            opacity="0.3"
          />
          <path
            d="M12,-20 Q28,-14 26,4 Q18,12 8,-2 Z"
            fill="#EAB308"
            opacity="0.45"
          />

          {/* Glowing logistics connection pins & flight paths */}
          <path d="M-15,-10 Q0,-35 22,-5" fill="none" stroke="#FACC15" strokeWidth="2" strokeDasharray="4 2" />
          <circle cx="-15" cy="-10" r="3" fill="#FACC15" />
          <circle cx="22" cy="-5" r="3" fill="#9333EA" />
          <circle cx="0" cy="12" r="2.5" fill="#FACC15" />
        </g>

        {/* --- CONVEYOR BELT SYSTEM WITH PARCELS --- */}
        <g id="conveyor-system">
          {/* Conveyor Belt Loop Geometry */}
          {/* Segment 1: Exiting warehouse */}
          <polygon points="460,265 520,295 490,312 430,282" fill="url(#pg-conveyor-belt)" />
          {/* Segment 2: Turning towards left */}
          <polygon points="430,282 490,312 300,410 240,380" fill="url(#pg-conveyor-belt)" />
          {/* Segment 3: Front turn loop */}
          <polygon points="240,380 300,410 260,432 200,402" fill="url(#pg-conveyor-belt)" />
          {/* Segment 4: Returning back */}
          <polygon points="200,402 260,432 140,370 80,340" fill="url(#pg-conveyor-belt)" />
          {/* Segment 5: Back entrance */}
          <polygon points="80,340 140,370 230,320 170,290" fill="url(#pg-conveyor-belt)" />

          {/* Conveyor metallic frame legs */}
          <g stroke="#64748B" strokeWidth="3" strokeLinecap="round">
            <line x1="475" y1="305" x2="475" y2="340" />
            <line x1="365" y1="362" x2="365" y2="397" />
            <line x1="250" y1="421" x2="250" y2="456" />
            <line x1="170" y1="386" x2="170" y2="421" />
            <line x1="110" y1="355" x2="110" y2="390" />
          </g>

          {/* Scanner / Barcode Gate Arch 1 */}
          <g transform="translate(440, 275)">
            <path d="M0,0 L20,-10 L20,-30 L0,-20 Z" fill="#FACC15" />
            <path d="M20,-10 L26,-7 L26,-27 L20,-30 Z" fill="#CA8A04" />
            <path d="M0,-20 L20,-30 L26,-27 L6,-17 Z" fill="#FEF08A" />
            {/* Laser scanning beam */}
            <line x1="10" y1="-15" x2="10" y2="10" stroke="#EF4444" strokeWidth="1.5" opacity="0.8" />
          </g>

          {/* Scanner / Barcode Gate Arch 2 */}
          <g transform="translate(230, 395)">
            <path d="M0,0 L24,12 L24,-12 L0,-24 Z" fill="#7E22CE" />
            <path d="M24,12 L30,9 L30,-15 L24,-12 Z" fill="#581C87" />
            <path d="M0,-24 L24,-12 L30,-15 L6,-27 Z" fill="#A855F7" />
            <line x1="12" y1="-6" x2="12" y2="16" stroke="#22C55E" strokeWidth="1.5" opacity="0.8" />
          </g>

          {/* --- PARCELS ON CONVEYOR (Yellow & Purple packaging) --- */}
          {/* Parcel 1 (Near Building Exit) */}
          <g transform="translate(460, 280)">
            <polygon points="0,0 16,-8 28,-2 12,6" fill="#FACC15" stroke="#CA8A04" strokeWidth="0.5" />
            <polygon points="0,0 12,6 12,18 0,12" fill="#EAB308" />
            <polygon points="12,6 28,-2 28,10 12,18" fill="#CA8A04" />
            {/* Purple tape */}
            <line x1="6" y1="3" x2="20" y2="-4" stroke="#6B21A8" strokeWidth="1.5" />
          </g>

          {/* Parcel 2 (Mid conveyor) */}
          <g transform="translate(360, 335)">
            <polygon points="0,0 18,-9 30,-3 12,6" fill="#EDE9FE" stroke="#C4B5FD" strokeWidth="0.5" />
            <polygon points="0,0 12,6 12,20 0,14" fill="#DDD6FE" />
            <polygon points="12,6 30,-3 30,11 12,20" fill="#C4B5FD" />
            {/* Yellow tape */}
            <line x1="6" y1="3" x2="21" y2="-5" stroke="#EAB308" strokeWidth="2" />
          </g>

          {/* Parcel 3 (Front corner) */}
          <g transform="translate(265, 385)">
            <polygon points="0,0 20,-10 32,-4 12,6" fill="#FACC15" stroke="#CA8A04" strokeWidth="0.5" />
            <polygon points="0,0 12,6 12,16 0,10" fill="#EAB308" />
            <polygon points="12,6 32,-4 32,6 12,16" fill="#CA8A04" />
            <line x1="6" y1="3" x2="22" y2="-5" stroke="#581C87" strokeWidth="2" />
          </g>

          {/* Parcel 4 (Turn corner) */}
          <g transform="translate(180, 375)">
            <polygon points="0,0 14,7 26,1 12,-6" fill="#7E22CE" stroke="#581C87" strokeWidth="0.5" />
            <polygon points="0,0 14,7 14,18 0,11" fill="#6B21A8" />
            <polygon points="14,7 26,1 26,12 14,18" fill="#581C87" />
            <line x1="7" y1="3.5" x2="19" y2="-2.5" stroke="#FDE047" strokeWidth="1.5" />
          </g>

          {/* Parcel 5 (Back returning) */}
          <g transform="translate(130, 330)">
            <polygon points="0,0 16,-8 28,-2 12,6" fill="#FDE047" stroke="#EAB308" strokeWidth="0.5" />
            <polygon points="0,0 12,6 12,15 0,9" fill="#EAB308" />
            <polygon points="12,6 28,-2 28,7 12,15" fill="#CA8A04" />
          </g>
        </g>

        {/* --- LOGISTICS PERSONNEL (3D stylized miniature staff) --- */}
        {/* Worker 1 (Next to Globe) */}
        <g id="worker-1" transform="translate(305, 395)">
          <ellipse cx="0" cy="18" rx="6" ry="2.5" fill="#1E1B4B" opacity="0.3" />
          {/* Head & Helmet */}
          <circle cx="0" cy="-6" r="3.5" fill="#FED7AA" />
          <ellipse cx="0" cy="-8" rx="4" ry="2" fill="#FACC15" />
          {/* Body & Vest */}
          <rect x="-3.5" y="-2" width="7" height="11" rx="1.5" fill="#6B21A8" />
          <rect x="-3" y="0" width="6" height="7" fill="#FACC15" />
          {/* Clipboard / Tablet */}
          <polygon points="2,2 7,4 7,8 2,6" fill="#FFFFFF" stroke="#334155" strokeWidth="0.5" />
          {/* Legs */}
          <line x1="-2" y1="9" x2="-2" y2="17" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="2" y1="9" x2="2" y2="17" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" />
        </g>

        {/* Worker 2 (Next to Worker 1) */}
        <g id="worker-2" transform="translate(322, 404)">
          <ellipse cx="0" cy="18" rx="6" ry="2.5" fill="#1E1B4B" opacity="0.3" />
          <circle cx="0" cy="-6" r="3.5" fill="#FED7AA" />
          <ellipse cx="0" cy="-8" rx="4" ry="2" fill="#FACC15" />
          <rect x="-3.5" y="-2" width="7" height="11" rx="1.5" fill="#6B21A8" />
          <rect x="-3" y="0" width="6" height="7" fill="#FACC15" />
          <line x1="-2" y1="9" x2="-2" y2="17" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="2" y1="9" x2="2" y2="17" stroke="#1E293B" strokeWidth="2.5" strokeLinecap="round" />
        </g>

        {/* Floating Accent Badges (Live Tracking, 100% Express) */}
        <g transform="translate(480, 115)">
          <rect x="0" y="0" width="90" height="26" rx="13" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1" filter="drop-shadow(0 4px 10px rgba(88,28,135,0.12))" />
          <circle cx="14" cy="13" r="5" fill="#22C55E" />
          <text x="26" y="17" fill="#3B0764" fontSize="10" fontWeight="800" fontFamily="sans-serif">
            24/7 EN VIVO
          </text>
        </g>

        <g transform="translate(100, 240)">
          <rect x="0" y="0" width="110" height="28" rx="14" fill="#FFFFFF" stroke="#FDE047" strokeWidth="1.5" filter="drop-shadow(0 4px 10px rgba(234,179,8,0.18))" />
          <circle cx="16" cy="14" r="6" fill="#FACC15" />
          <path d="M14 14 L16 16 L19 12" stroke="#581C87" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <text x="28" y="18" fill="#581C87" fontSize="10" fontWeight="900" fontFamily="sans-serif">
            100% SEGURO
          </text>
        </g>
      </svg>
    </div>
  );
}
