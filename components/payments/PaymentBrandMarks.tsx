interface PaymentMarkProps {
  className?: string;
}

const markFrame =
  "shrink-0 overflow-hidden rounded-xl shadow-sm ring-1 ring-black/5 dark:ring-white/10";

/** PSE — azul ACH Colombia (#0033A0). */
export function PseBrandMark({ className = "h-11 w-11" }: PaymentMarkProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={`${markFrame} ${className}`}
      aria-hidden="true"
      role="img"
    >
      <rect width="48" height="48" fill="#0033A0" />
      <text
        x="24"
        y="29"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="14"
        fontWeight="800"
        fontFamily="Arial, Helvetica, sans-serif"
        letterSpacing="0.08em"
      >
        PSE
      </text>
    </svg>
  );
}

/** Nequi — morado Bancolombia (#6B00FF). */
export function NequiBrandMark({ className = "h-11 w-11" }: PaymentMarkProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={`${markFrame} ${className}`}
      aria-hidden="true"
      role="img"
    >
      <rect width="48" height="48" fill="#6B00FF" />
      <circle cx="24" cy="22" r="9" fill="none" stroke="#FFFFFF" strokeWidth="2.5" />
      <text
        x="24"
        y="26"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="8"
        fontWeight="700"
        fontFamily="Arial, Helvetica, sans-serif"
      >
        N
      </text>
      <text
        x="24"
        y="37"
        textAnchor="middle"
        fill="#E9D5FF"
        fontSize="6.5"
        fontWeight="700"
        fontFamily="Arial, Helvetica, sans-serif"
        letterSpacing="0.12em"
      >
        NEQUI
      </text>
    </svg>
  );
}

/** Daviplata — rojo Davivienda (#E1251B). */
export function DaviplataBrandMark({ className = "h-11 w-11" }: PaymentMarkProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={`${markFrame} ${className}`}
      aria-hidden="true"
      role="img"
    >
      <rect width="48" height="48" fill="#E1251B" />
      <path
        fill="#FFFFFF"
        d="M16 31V17h4.2l3.1 8.5 3.1-8.5H30.5v14h-3.4V22.8l-3.2 8.2h-2.4l-3.2-8.2V31H16z"
      />
      <text
        x="24"
        y="37.5"
        textAnchor="middle"
        fill="#FEE2E2"
        fontSize="5.5"
        fontWeight="700"
        fontFamily="Arial, Helvetica, sans-serif"
        letterSpacing="0.1em"
      >
        DAVIPLATA
      </text>
    </svg>
  );
}

/** Efecty / Baloto — verde y amarillo recaudo. */
export function EfectyBalotoBrandMark({ className = "h-11 w-11" }: PaymentMarkProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={`${markFrame} ${className}`}
      aria-hidden="true"
      role="img"
    >
      <rect width="48" height="48" fill="#00843D" />
      <rect x="0" y="30" width="48" height="18" fill="#FDB913" />
      <text
        x="24"
        y="21"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="7"
        fontWeight="800"
        fontFamily="Arial, Helvetica, sans-serif"
        letterSpacing="0.06em"
      >
        EFECTY
      </text>
      <text
        x="24"
        y="40"
        textAnchor="middle"
        fill="#1A1A1A"
        fontSize="6.5"
        fontWeight="800"
        fontFamily="Arial, Helvetica, sans-serif"
        letterSpacing="0.08em"
      >
        BALOTO
      </text>
    </svg>
  );
}
