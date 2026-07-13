import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { LandingNav } from "@/components/landing/LandingNav";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { PageContainer } from "@/components/ui/PageContainer";

export const metadata: Metadata = {
  title: "Política de privacidad — alcentimo",
  description:
    "Cómo alcentimo recopila, utiliza y protege tus datos al gestionar inventario, mensajes y publicaciones en redes sociales.",
};

const LAST_UPDATED = "13 de julio de 2026";

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

export default function PrivacyPage() {
  return (
    <>
      <LandingNav />
      <main className="min-h-dvh bg-zinc-50 dark:bg-zinc-950">
        <PageContainer narrow as="div" className="py-10 sm:py-14 lg:py-16">
          <header className="page-header">
            <p className="section-label">Legal</p>
            <h1 className="page-header-title">Política de privacidad</h1>
            <p className="page-header-desc">
              Última actualización: {LAST_UPDATED}
            </p>
          </header>

          <article className="card-panel mt-8 space-y-8">
            <PolicySection title="1. Introducción">
              <p>
                La presente Política de Privacidad describe cómo <strong>alcentimo</strong>{" "}
                («nosotros», «la plataforma» o «el servicio») recopila, utiliza,
                almacena y protege la información personal de los usuarios que acceden
                a nuestra aplicación SaaS de gestión comercial.
              </p>
              <p>
                Alcentimo permite a comerciantes administrar inventario, atender
                mensajes de clientes y publicar contenido en redes sociales
                conectadas (por ejemplo, Facebook y Messenger), entre otras
                funciones. Al utilizar el servicio, aceptas las prácticas descritas
                en este documento.
              </p>
            </PolicySection>

            <PolicySection title="2. Responsable del tratamiento">
              <p>
                El responsable del tratamiento de los datos es alcentimo, operador
                de la plataforma disponible en{" "}
                <Link href="/" className="link-brand">
                  alcentimo.com
                </Link>
                . Para consultas sobre privacidad puedes escribirnos a{" "}
                <a href="mailto:privacidad@alcentimo.com" className="link-brand">
                  privacidad@alcentimo.com
                </a>
                .
              </p>
            </PolicySection>

            <PolicySection title="3. Datos que recopilamos">
              <p>Podemos recopilar las siguientes categorías de información:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong>Datos de cuenta:</strong> nombre, correo electrónico,
                  contraseña (almacenada de forma segura mediante nuestro proveedor
                  de autenticación) y datos de perfil de tu tienda.
                </li>
                <li>
                  <strong>Datos comerciales:</strong> productos, inventario,
                  precios, pedidos, ventas y notas internas asociadas a tu
                  operación.
                </li>
                <li>
                  <strong>Datos de mensajería:</strong> conversaciones, contactos,
                  etiquetas y metadatos de comunicaciones gestionadas a través de
                  canales integrados (por ejemplo, Messenger).
                </li>
                <li>
                  <strong>Datos de redes sociales:</strong> identificadores de
                  página, tokens de acceso autorizados por ti, publicaciones
                  creadas desde la plataforma y métricas básicas asociadas.
                </li>
                <li>
                  <strong>Datos técnicos:</strong> dirección IP, tipo de navegador,
                  registros de actividad, cookies y datos de uso del servicio para
                  seguridad y mejora del producto.
                </li>
              </ul>
            </PolicySection>

            <PolicySection title="4. Cómo utilizamos tus datos">
              <p>Utilizamos la información recopilada para:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>Proporcionar, mantener y mejorar las funcionalidades de alcentimo.</li>
                <li>
                  Gestionar tu inventario, catálogo, bandeja de mensajes y
                  publicaciones en redes sociales según las acciones que realices.
                </li>
                <li>
                  Autenticarte de forma segura y proteger tu cuenta frente a accesos
                  no autorizados.
                </li>
                <li>
                  Cumplir obligaciones legales, resolver incidencias técnicas y
                  responder a solicitudes de soporte.
                </li>
                <li>
                  Enviarte comunicaciones operativas necesarias para el uso del
                  servicio (por ejemplo, alertas de seguridad o cambios relevantes).
                </li>
              </ul>
              <p>
                No vendemos tu información personal a terceros. Solo la compartimos
                en los casos descritos en la siguiente sección.
              </p>
            </PolicySection>

            <PolicySection title="5. Integraciones y terceros">
              <p>
                Para operar el servicio, alcentimo se integra con proveedores
                externos. Estos pueden procesar datos en nuestro nombre o según tus
                instrucciones al conectar una integración:
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong>Meta (Facebook, Messenger, Instagram, WhatsApp):</strong>{" "}
                  cuando autorizas la conexión, intercambiamos tokens y datos
                  necesarios para recibir mensajes, publicar contenido y sincronizar
                  tu cuenta comercial, conforme a las políticas de Meta.
                </li>
                <li>
                  <strong>Proveedores de infraestructura:</strong> alojamiento,
                  bases de datos y autenticación (por ejemplo, Supabase y Vercel).
                </li>
                <li>
                  <strong>Otros canales:</strong> integraciones adicionales que
                  actives voluntariamente desde tu panel de configuración.
                </li>
              </ul>
              <p>
                Al conectar una red social, también quedas sujeto a las políticas de
                privacidad y términos de uso de dichas plataformas.
              </p>
            </PolicySection>

            <PolicySection title="6. Publicaciones en redes sociales">
              <p>
                Cuando utilizas alcentimo para crear o programar publicaciones, el
                contenido (texto, imágenes y metadatos) se transmite a la API de la
                red social correspondiente únicamente con tu autorización expresa. No
                publicamos en tu nombre sin una acción iniciada por ti o por un
                usuario autorizado de tu cuenta.
              </p>
            </PolicySection>

            <PolicySection title="7. Conservación de datos">
              <p>
                Conservamos tus datos mientras mantengas una cuenta activa o sea
                necesario para prestarte el servicio, cumplir obligaciones legales,
                resolver disputas o hacer cumplir nuestros acuerdos. Puedes solicitar
                la eliminación de tu cuenta; en ese caso, eliminaremos o
                anonimizaremos tus datos personales, salvo cuando la ley exija su
                conservación.
              </p>
            </PolicySection>

            <PolicySection title="8. Seguridad">
              <p>
                Aplicamos medidas técnicas y organizativas razonables para proteger
                la información, incluyendo cifrado en tránsito (HTTPS), control de
                acceso, almacenamiento seguro de credenciales y buenas prácticas de
                desarrollo. Ningún sistema es completamente infalible; te
                recomendamos usar contraseñas robustas y no compartir tus credenciales.
              </p>
            </PolicySection>

            <PolicySection title="9. Tus derechos">
              <p>
                Según la legislación aplicable, puedes tener derecho a acceder,
                rectificar, eliminar, limitar u oponerte al tratamiento de tus
                datos, así como a solicitar la portabilidad de la información. Para
                ejercer estos derechos, escríbenos a{" "}
                <a href="mailto:privacidad@alcentimo.com" className="link-brand">
                  privacidad@alcentimo.com
                </a>
                . Responderemos en un plazo razonable.
              </p>
            </PolicySection>

            <PolicySection title="10. Cookies y tecnologías similares">
              <p>
                Utilizamos cookies y almacenamiento local para mantener tu sesión,
                recordar preferencias y mejorar la experiencia. Puedes configurar tu
                navegador para rechazar cookies, aunque algunas funciones del
                servicio podrían dejar de estar disponibles.
              </p>
            </PolicySection>

            <PolicySection title="11. Menores de edad">
              <p>
                Alcentimo está dirigido a comerciantes y no está pensado para menores
                de 18 años. No recopilamos deliberadamente información de menores. Si
                detectamos datos de un menor, los eliminaremos de forma diligente.
              </p>
            </PolicySection>

            <PolicySection title="12. Cambios a esta política">
              <p>
                Podemos actualizar esta Política de Privacidad ocasionalmente. La
                fecha de «Última actualización» al inicio del documento reflejará la
                versión vigente. Los cambios sustanciales se comunicarán por medios
                razonables (por ejemplo, aviso en la plataforma o correo electrónico).
              </p>
            </PolicySection>

            <PolicySection title="13. Contacto">
              <p>
                Si tienes preguntas sobre esta política o sobre el tratamiento de tus
                datos, contáctanos en{" "}
                <a href="mailto:privacidad@alcentimo.com" className="link-brand">
                  privacidad@alcentimo.com
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
