const valueProps = [
  {
    title: "Catálogo e inventario en un solo lugar",
    description:
      "Publica productos, controla stock y comparte tu vitrina con un enlace propio.",
  },
  {
    title: "Precios en USD con conversión automática a Bs.",
    description:
      "Define precios en dólares; el sistema calcula bolívares con la tasa BCV del día.",
  },
  {
    title: "Listo para vender en minutos",
    description:
      "Sin instalaciones ni configuraciones técnicas. Empieza gratis y escala cuando crezcas.",
  },
];

export function Features() {
  return (
    <section
      id="caracteristicas"
      className="section-padding border-b border-zinc-200/60 bg-white dark:border-zinc-800/60 dark:bg-zinc-950"
    >
      <div className="page-container max-w-3xl">
        <p className="section-label">Por qué alcentimo</p>
        <h2 className="section-title mt-3">
          Todo lo que necesitas para operar tu negocio online
        </h2>

        <ul className="mt-10 space-y-8">
          {valueProps.map((item) => (
            <li key={item.title}>
              <h3 className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                {item.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                {item.description}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
