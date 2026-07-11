interface CarrierMarkProps {
  className?: string;
}

const markFrame =
  "shrink-0 overflow-hidden rounded-xl shadow-sm ring-1 ring-black/5 dark:ring-white/10";

/** MRW — rojo corporativo (#E30613). */
export function MrwBrandMark({ className = "h-11 w-11" }: CarrierMarkProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={`${markFrame} ${className}`}
      aria-hidden="true"
      role="img"
    >
      <rect width="48" height="48" fill="#E30613" />
      <path
        fill="#FFFFFF"
        d="M11.5 31V17.2h4.1l3.4 9.2 3.4-9.2h4.1V31h-3.2v-9.6l-3.5 9.6h-2.6l-3.5-9.6V31H11.5zm19.2 0 5.4-13.8h3.8L40.5 31h-3.6l-1-2.8h-5.5l-1 2.8h-3.7zm5.8-5.5-2-5.4-2 5.4h4z"
      />
    </svg>
  );
}

/** Tealca — azul institucional (#004B9C). */
export function TealcaBrandMark({ className = "h-11 w-11" }: CarrierMarkProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={`${markFrame} ${className}`}
      aria-hidden="true"
      role="img"
    >
      <rect width="48" height="48" fill="#004B9C" />
      <path
        fill="#FFFFFF"
        d="M24 13.5c-3.8 2.8-6.2 5.8-6.2 9.2 0 2.4 1.7 4.1 4.1 4.1 1.2 0 2.2-.5 2.9-1.3.6.7 1.6 1.2 2.7 1.2 2.4 0 4.1-1.7 4.1-4.1 0-3.4-2.4-6.4-6.2-9.2zm0 2.8c2.2 1.6 3.6 3.4 4.1 5.3-1.1-.4-2.2-.1-3 .7-.6-.6-1.4-.9-2.3-.9-.8 0-1.6.3-2.2.9-.8-.7-1.8-1-2.9-.7.5-1.9 1.9-3.7 4.1-5.3z"
      />
      <text
        x="24"
        y="36"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="7"
        fontWeight="700"
        fontFamily="Arial, Helvetica, sans-serif"
        letterSpacing="0.1em"
      >
        TEALCA
      </text>
    </svg>
  );
}

/** Zoom Encomiendas Venezuela — naranja (#F7941D). No confundir con SiZoom. */
export function ZoomDeliveryBrandMark({ className = "h-11 w-11" }: CarrierMarkProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={`${markFrame} ${className}`}
      aria-hidden="true"
      role="img"
    >
      <rect width="48" height="48" fill="#F7941D" />
      <path
        fill="#1A1A1A"
        d="M10.5 30.5V17.5h5.8c2.8 0 4.7 1.4 4.7 3.9 0 1.6-.8 2.9-2.2 3.5l3.1 5.6h-3.5l-2.7-5h-2.1v5H10.5zm3.2-7.8h2.4c1.2 0 1.9-.6 1.9-1.6s-.7-1.6-1.9-1.6h-2.4v3.2zm11 7.8 4.2-13h3.4l4.2 13h-3.3l-.8-2.6h-4.4l-.8 2.6h-3.3zm5.2-5.1-1.5-4.8-1.5 4.8h3z"
      />
    </svg>
  );
}

/** Domesa — verde corporativo (#006B3F). */
export function DomesaBrandMark({ className = "h-11 w-11" }: CarrierMarkProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={`${markFrame} ${className}`}
      aria-hidden="true"
      role="img"
    >
      <rect width="48" height="48" fill="#006B3F" />
      <circle cx="24" cy="22" r="8.5" fill="none" stroke="#FFFFFF" strokeWidth="2.4" />
      <path
        fill="#FFFFFF"
        d="M24 15.8c-3.4 0-6.2 2.6-6.2 5.8h2.6c0-1.8 1.6-3.2 3.6-3.2s3.6 1.4 3.6 3.2c0 1.2-.7 2.2-1.8 2.8l-2.4 1.3c-1.5.8-2.4 2.2-2.4 3.8V28h2.6v-.3c0-.8.4-1.5 1.2-1.9l2.4-1.3c1.8-1 2.9-2.8 2.9-4.9 0-3.2-2.8-5.8-6.2-5.8z"
      />
      <text
        x="24"
        y="36.5"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="6.5"
        fontWeight="700"
        fontFamily="Arial, Helvetica, sans-serif"
        letterSpacing="0.08em"
      >
        DOMESA
      </text>
    </svg>
  );
}

/** Liberty Express — púrpura corporativo (#5B2D8B). */
export function LibertyExpressBrandMark({
  className = "h-11 w-11",
}: CarrierMarkProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={`${markFrame} ${className}`}
      aria-hidden="true"
      role="img"
    >
      <rect width="48" height="48" fill="#5B2D8B" />
      <path
        fill="#FFFFFF"
        d="M13 19.5h22v1.8H13v-1.8zm0 4.2h16v1.8H13v-1.8zm0 4.2h19v1.8H13v-1.8z"
        opacity="0.85"
      />
      <text
        x="24"
        y="17.5"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="6"
        fontWeight="700"
        fontFamily="Arial, Helvetica, sans-serif"
        letterSpacing="0.06em"
      >
        LIBERTY
      </text>
      <text
        x="24"
        y="36.5"
        textAnchor="middle"
        fill="#E9D5FF"
        fontSize="5.5"
        fontWeight="600"
        fontFamily="Arial, Helvetica, sans-serif"
        letterSpacing="0.14em"
      >
        EXPRESS
      </text>
    </svg>
  );
}
