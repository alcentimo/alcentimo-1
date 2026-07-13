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

/** Servientrega — rosa corporativo (#E4002B). */
export function ServientregaBrandMark({ className = "h-11 w-11" }: CarrierMarkProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={`${markFrame} ${className}`}
      aria-hidden="true"
      role="img"
    >
      <rect width="48" height="48" fill="#E4002B" />
      <path
        fill="#FFFFFF"
        d="M12 30V18h5.2c3.2 0 5.4 1.6 5.4 4.2 0 1.8-1 3.2-2.6 3.8L24 30h-3.6l-1.8-3.4h-3.4V30H12zm3.4-6.8h1.8c1.2 0 1.9-.6 1.9-1.5s-.7-1.5-1.9-1.5h-1.8v3z"
      />
      <text
        x="24"
        y="37"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="5"
        fontWeight="700"
        fontFamily="Arial, Helvetica, sans-serif"
        letterSpacing="0.06em"
      >
        SERVIENTREGA
      </text>
    </svg>
  );
}

/** Inter Rapidísimo — azul (#005BAC). */
export function InterRapidisimoBrandMark({
  className = "h-11 w-11",
}: CarrierMarkProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={`${markFrame} ${className}`}
      aria-hidden="true"
      role="img"
    >
      <rect width="48" height="48" fill="#005BAC" />
      <path
        fill="#FFFFFF"
        d="M14 31V17h8.5c3.8 0 6.5 2 6.5 5.2 0 3.2-2.7 5.2-6.5 5.2H18.8l-1.8 3.6H14zm4.4-7.2h4c1.8 0 2.9-.9 2.9-2.4s-1.1-2.4-2.9-2.4h-4v4.8z"
      />
      <text
        x="24"
        y="37.5"
        textAnchor="middle"
        fill="#BFDBFE"
        fontSize="4.8"
        fontWeight="700"
        fontFamily="Arial, Helvetica, sans-serif"
        letterSpacing="0.05em"
      >
        INTER RAPIDÍSIMO
      </text>
    </svg>
  );
}

/** Coordinadora — azul y rojo (#003DA5 / #ED1C24). */
export function CoordinadoraBrandMark({ className = "h-11 w-11" }: CarrierMarkProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={`${markFrame} ${className}`}
      aria-hidden="true"
      role="img"
    >
      <rect width="48" height="48" fill="#003DA5" />
      <rect x="0" y="34" width="48" height="14" fill="#ED1C24" />
      <text
        x="24"
        y="22"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="6"
        fontWeight="800"
        fontFamily="Arial, Helvetica, sans-serif"
        letterSpacing="0.04em"
      >
        COORDINADORA
      </text>
    </svg>
  );
}

/** Envíame — teal agregador (#00B4A0). */
export function EnviameBrandMark({ className = "h-11 w-11" }: CarrierMarkProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={`${markFrame} ${className}`}
      aria-hidden="true"
      role="img"
    >
      <rect width="48" height="48" fill="#00B4A0" />
      <path
        fill="#FFFFFF"
        d="M12 24h18l-4-4v3H14v2h12v3l4-4H12z"
        opacity="0.95"
      />
      <text
        x="24"
        y="35"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="7"
        fontWeight="700"
        fontFamily="Arial, Helvetica, sans-serif"
        letterSpacing="0.1em"
      >
        ENVÍAME
      </text>
    </svg>
  );
}

/** Mipaquete — naranja agregador (#F97316). */
export function MipaqueteBrandMark({ className = "h-11 w-11" }: CarrierMarkProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={`${markFrame} ${className}`}
      aria-hidden="true"
      role="img"
    >
      <rect width="48" height="48" fill="#F97316" />
      <rect x="14" y="16" width="20" height="14" rx="2" fill="#FFFFFF" />
      <path fill="#F97316" d="M14 20h20v2H14z" />
      <text
        x="24"
        y="37"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="6.5"
        fontWeight="700"
        fontFamily="Arial, Helvetica, sans-serif"
        letterSpacing="0.08em"
      >
        MIPAQUETE
      </text>
    </svg>
  );
}

/** Correo Argentino — azul y amarillo institucional. */
export function CorreoArgentinoBrandMark({ className = "h-11 w-11" }: CarrierMarkProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={`${markFrame} ${className}`}
      aria-hidden="true"
      role="img"
    >
      <rect width="48" height="48" fill="#003DA5" />
      <rect x="0" y="32" width="48" height="16" fill="#FDB913" />
      <text
        x="24"
        y="20"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="5.5"
        fontWeight="800"
        fontFamily="Arial, Helvetica, sans-serif"
        letterSpacing="0.04em"
      >
        CORREO
      </text>
      <text
        x="24"
        y="41"
        textAnchor="middle"
        fill="#1A1A1A"
        fontSize="5.5"
        fontWeight="800"
        fontFamily="Arial, Helvetica, sans-serif"
        letterSpacing="0.06em"
      >
        ARGENTINO
      </text>
    </svg>
  );
}

/** Andreani — rojo corporativo (#E30613). */
export function AndreaniBrandMark({ className = "h-11 w-11" }: CarrierMarkProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={`${markFrame} ${className}`}
      aria-hidden="true"
      role="img"
    >
      <rect width="48" height="48" fill="#E30613" />
      <text
        x="24"
        y="28"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="7.5"
        fontWeight="800"
        fontFamily="Arial, Helvetica, sans-serif"
        letterSpacing="0.06em"
      >
        ANDREANI
      </text>
    </svg>
  );
}

/** OCA — azul (#004B9C). */
export function OcaBrandMark({ className = "h-11 w-11" }: CarrierMarkProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={`${markFrame} ${className}`}
      aria-hidden="true"
      role="img"
    >
      <rect width="48" height="48" fill="#004B9C" />
      <ellipse cx="24" cy="24" rx="12" ry="8" fill="none" stroke="#FFFFFF" strokeWidth="2.5" />
      <text
        x="24"
        y="27"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="9"
        fontWeight="800"
        fontFamily="Arial, Helvetica, sans-serif"
      >
        OCA
      </text>
    </svg>
  );
}

/** Pickit — naranja puntos de retiro (#FF6B00). */
export function PickitBrandMark({ className = "h-11 w-11" }: CarrierMarkProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={`${markFrame} ${className}`}
      aria-hidden="true"
      role="img"
    >
      <rect width="48" height="48" fill="#FF6B00" />
      <circle cx="24" cy="20" r="6" fill="#FFFFFF" />
      <path fill="#FFFFFF" d="M24 28c-4 0-7 2-7 4.5V35h14v-2.5C31 30 28 28 24 28z" />
      <text
        x="24"
        y="42"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="6.5"
        fontWeight="700"
        fontFamily="Arial, Helvetica, sans-serif"
        letterSpacing="0.1em"
      >
        PICKIT
      </text>
    </svg>
  );
}

/** Mensajería express en moto — teal (#0D9488). */
export function MensajeriaExpressBrandMark({
  className = "h-11 w-11",
}: CarrierMarkProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={`${markFrame} ${className}`}
      aria-hidden="true"
      role="img"
    >
      <rect width="48" height="48" fill="#0D9488" />
      <circle cx="16" cy="32" r="4" fill="#FFFFFF" />
      <circle cx="32" cy="32" r="4" fill="#FFFFFF" />
      <path
        fill="#FFFFFF"
        d="M12 24h20l4 6H12v-6zm6-6h14l4 6H18v-6z"
      />
      <text
        x="24"
        y="42"
        textAnchor="middle"
        fill="#CCFBF1"
        fontSize="4.8"
        fontWeight="700"
        fontFamily="Arial, Helvetica, sans-serif"
        letterSpacing="0.04em"
      >
        MOTO EXPRESS
      </text>
    </svg>
  );
}
