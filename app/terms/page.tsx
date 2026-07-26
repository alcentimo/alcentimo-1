import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { PageContainer } from "@/components/ui/PageContainer";

export const metadata: Metadata = {
  title: "Términos y Condiciones — alcentimo",
  description:
    "Condiciones de uso de alcentimo: plataforma SaaS de e-commerce y catálogos con marca blanca para comerciantes.",
};

const LAST_UPDATED = "25 de julio de 2026";

function PolicySection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {title}
      </h2>
      <div className="space-y-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
        {children}
      </div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <>
      <LandingNav />
      <main className="min-h-dvh bg-zinc-50 dark:bg-zinc-950">
        <PageContainer narrow as="div" className="py-10 sm:py-14 lg:py-16">
          <header className="page-header">
            <p className="section-label">Legal</p>
            <h1 className="page-header-title">Términos y Condiciones</h1>
            <p className="page-header-desc">
              Última actualización: {LAST_UPDATED}
            </p>
          </header>

          <article className="card-panel mt-8 space-y-8">
            <PolicySection title="1. Introducción">
              <p>
                Los presentes Términos y Condiciones («Términos») regulan el acceso y
                uso de <strong>alcentimo</strong> («la plataforma», «nosotros» o «el
                servicio»), una aplicación SaaS de comercio electrónico y gestión
                comercial que permite a comerciantes crear catálogos digitales, gestionar
                inventario, recibir pedidos y publicar su tienda con identidad de marca
                blanca (logo, colores y dominio propio).
              </p>
              <p>
                Al registrarte, acceder o utilizar alcentimo, declaras haber leído,
                comprendido y aceptado estos Términos y nuestra{" "}
                <Link href="/privacy" className="link-brand">
                  Política de Privacidad
                </Link>
                . Si no estás de acuerdo, no utilices el servicio.
              </p>
            </PolicySection>

            <PolicySection title="2. Elegibilidad y registro">
              <p>
                El servicio está dirigido a personas mayores de 18 años con capacidad
                legal para contratar. Al crear una cuenta, garantizas que la información
                proporcionada es veraz, actualizada y completa, y te comprometes a
                mantenerla actualizada.
              </p>
              <p>
                Eres responsable de la confidencialidad de tus credenciales y de toda
                actividad realizada bajo tu cuenta. Debes notificarnos de inmediato ante
                cualquier uso no autorizado.
              </p>
            </PolicySection>

            <PolicySection title="3. Descripción del servicio">
              <p>Alcentimo ofrece, entre otras, las siguientes funcionalidades:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>Catálogo online y panel de administración para tu negocio.</li>
                <li>
                  Gestión de productos, inventario, precios, pedidos y ventas.
                </li>
                <li>
                  Personalización de marca blanca: logo, colores, dominio personalizado
                  y experiencia de compra bajo tu identidad comercial.
                </li>
                <li>
                  Integraciones con canales de comunicación y redes sociales que actives
                  voluntariamente (por ejemplo, WhatsApp, Messenger o Meta).
                </li>
                <li>Herramientas de asistencia con inteligencia artificial.</li>
              </ul>
              <p>
                Podemos modificar, ampliar o limitar funcionalidades del servicio con
                aviso razonable cuando el cambio afecte de forma sustancial tu uso.
              </p>
            </PolicySection>

            <PolicySection title="4. Planes, facturación y prueba gratuita">
              <p>
                Algunas funciones pueden requerir una suscripción de pago. Los precios,
                límites y características de cada plan se muestran en la plataforma y
                pueden actualizarse; los cambios no afectarán retroactivamente un periodo
                ya pagado salvo acuerdo distinto o exigencia legal.
              </p>
              <p>
                Las pruebas gratuitas o promociones, cuando existan, se rigen por las
                condiciones indicadas al momento de la oferta. Al finalizar un periodo de
                prueba, el acceso a funciones premium puede restringirse si no contratas
                un plan de pago.
              </p>
            </PolicySection>

            <PolicySection title="5. Uso aceptable">
              <p>Te comprometes a utilizar alcentimo de forma lícita y responsable. Queda
                prohibido, entre otros:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  Publicar productos ilegales, fraudulentos, engañosos o que infrinjan
                  derechos de terceros.
                </li>
                <li>
                  Utilizar la plataforma para spam, phishing, malware o actividades que
                  perjudiquen a clientes, terceros o la infraestructura del servicio.
                </li>
                <li>
                  Intentar acceder sin autorización a cuentas, datos o sistemas ajenos.
                </li>
                <li>
                  Revender o sublicenciar el acceso al servicio sin autorización expresa.
                </li>
              </ul>
              <p>
                Podemos suspender o cancelar cuentas que violen estos Términos o la ley
                aplicable, con o sin previo aviso según la gravedad del incumplimiento.
              </p>
            </PolicySection>

            <PolicySection title="6. Contenido de tu tienda">
              <p>
                Conservas la titularidad del contenido que cargues (productos, imágenes,
                textos, precios y demás materiales). Nos concedes una licencia limitada,
                no exclusiva y revocable para alojar, procesar, mostrar y transmitir ese
                contenido únicamente con el fin de prestarte el servicio.
              </p>
              <p>
                Eres el único responsable de la legalidad, exactitud y actualización de
                la información publicada en tu catálogo, incluyendo precios, disponibilidad,
                impuestos aplicables y cumplimiento de normativas de comercio y protección
                al consumidor en tu jurisdicción.
              </p>
            </PolicySection>

            <PolicySection title="7. Marca blanca y dominios">
              <p>
                Cuando configures marca blanca o un dominio personalizado, declaras tener
                derecho a usar las marcas, logotipos y nombres comerciales asociados. No
                debes sugerir que alcentimo es el vendedor final ante tus clientes, salvo
                donde la ley o las integraciones lo exijan (por ejemplo, avisos de
                procesamiento de pagos).
              </p>
              <p>
                La configuración DNS, certificados y disponibilidad de dominios de terceros
                dependen también de proveedores externos; no garantizamos tiempos de
                propagación ni continuidad fuera de nuestro control.
              </p>
            </PolicySection>

            <PolicySection title="8. Propiedad intelectual de alcentimo">
              <p>
                El software, diseño, código, documentación y marca alcentimo son propiedad
                nuestra o de nuestros licenciantes. Estos Términos no te transfieren
                ningún derecho de propiedad intelectual sobre la plataforma, salvo el
                derecho limitado de uso durante la vigencia de tu cuenta y conforme al plan
                contratado.
              </p>
            </PolicySection>

            <PolicySection title="9. Integraciones de terceros">
              <p>
                Las conexiones con WhatsApp, Meta, pasarelas de pago u otros servicios
                están sujetas también a los términos y políticas de esos proveedores. No
                somos responsables de interrupciones, cambios de API o restricciones
                impuestas por terceros.
              </p>
            </PolicySection>

            <PolicySection title="10. Limitación de responsabilidad">
              <p>
                El servicio se proporciona «tal cual» y «según disponibilidad», dentro de
                los límites permitidos por la ley. No garantizamos resultados comerciales
                específicos, ventas mínimas ni ausencia total de errores.
              </p>
              <p>
                En la medida permitida por la legislación aplicable, alcentimo no será
                responsable por daños indirectos, lucro cesante, pérdida de datos o
                reclamaciones derivadas del uso de tu catálogo por parte de tus clientes
                finales, salvo dolo o negligencia grave imputable directamente a nosotros.
              </p>
            </PolicySection>

            <PolicySection title="11. Suspensión y cancelación">
              <p>
                Puedes cancelar tu cuenta en cualquier momento desde el panel o
                contactándonos. Tras la cancelación, podremos conservar ciertos datos
                durante el plazo necesario para cumplir obligaciones legales, resolver
                disputas o respaldar copias de seguridad, conforme a nuestra Política de
                Privacidad.
              </p>
              <p>
                Nos reservamos el derecho de suspender o cerrar cuentas por incumplimiento
                de estos Términos, riesgo de seguridad, impago o requerimiento de una
                autoridad competente.
              </p>
            </PolicySection>

            <PolicySection title="12. Modificaciones">
              <p>
                Podemos actualizar estos Términos ocasionalmente. Publicaremos la versión
                vigente en esta página e indicaremos la fecha de última actualización. El
                uso continuado del servicio tras cambios sustanciales implica tu aceptación
                de los Términos revisados, salvo que la ley exija un consentimiento
                adicional.
              </p>
            </PolicySection>

            <PolicySection title="13. Ley aplicable y contacto">
              <p>
                Estos Términos se interpretan conforme a las leyes aplicables en la
                jurisdicción desde la que operamos el servicio, sin perjuicio de derechos
                imperativos que te correspondan como consumidor según tu país de residencia.
              </p>
              <p>
                Para consultas legales o sobre estos Términos, escríbenos a{" "}
                <a href="mailto:legal@alcentimo.com" className="link-brand">
                  legal@alcentimo.com
                </a>
                .
              </p>
            </PolicySection>
          </article>

          <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
            <Link href="/" className="link-brand">
              Volver al inicio
            </Link>
          </p>
        </PageContainer>
      </main>
      <LandingFooter />
    </>
  );
}
