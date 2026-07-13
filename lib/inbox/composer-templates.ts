export interface InboxReplyTemplate {
  id: string;
  label: string;
  text: string;
}

export const INBOX_REPLY_TEMPLATES: InboxReplyTemplate[] = [
  {
    id: "greeting",
    label: "Saludo inicial",
    text: "¡Hola! Gracias por escribirnos. ¿En qué producto estás interesado hoy?",
  },
  {
    id: "catalog",
    label: "Enviar catálogo",
    text: "Te comparto nuestro catálogo actualizado. Avísame cuál producto te interesa y te ayudo a cerrar el pedido.",
  },
  {
    id: "payment",
    label: "Link de pago",
    text: "Aquí tienes el enlace para completar tu pago de forma segura. Confírmame cuando lo hayas realizado.",
  },
  {
    id: "shipping",
    label: "Pedir dirección",
    text: "Para coordinar el envío, ¿podrías confirmarme tu dirección completa, ciudad y un teléfono de contacto?",
  },
  {
    id: "followup",
    label: "Seguimiento",
    text: "¿Sigues interesado? Quedo atento para ayudarte a cerrar tu pedido hoy mismo.",
  },
];
