# Integración Facebook / Messenger — Alcentimo

Documentación interna para llevar la integración de Facebook al estándar de la industria con Meta Graph API.

**Última actualización:** 2026-07-13  
**Graph API version en código:** `v21.0` (`lib/inbox/meta-oauth.ts`)

---

## 1. Roadmap de comunicación — Webhooks en tiempo real

### ¿La estructura actual es eficiente?

**Sí, para recepción de mensajes en tiempo real la arquitectura base es correcta y alineada con Meta:**

| Práctica de industria | Estado en Alcentimo |
|----------------------|---------------------|
| Un solo webhook HTTPS por app | ✅ `POST /api/webhooks/meta` |
| Verificación GET (`hub.challenge`) | ✅ `GET /api/webhooks/meta` |
| Validación `X-Hub-Signature-256` (HMAC-SHA256) | ✅ `verifyMetaWebhookSignature()` |
| Respuesta **200 inmediata** antes de procesar | ✅ `after()` en Next.js para ingest en background |
| Objeto `page` + campo `messaging` para Messenger | ✅ `ingestMessagingEntry()` |
| Lookup por Page ID (`entry.id` = `external_account_id`) | ✅ `findIntegration(provider: messenger)` |
| Idempotencia por `message.mid` | ✅ `ingestInboundMessage()` deduplica por `external_message_id` |

**Flujo actual (Messenger):**

```
Meta Platform
  → POST /api/webhooks/meta  (object: "page", entry[].messaging[])
  → Firma + ack 200
  → after(): findIntegration(messenger, pageId)
  → channel_messages (legacy) + ingestInboundMessage()
  → inbox_contacts → inbox_conversations → inbox_messages
  → UI /dashboard/mensajes
```

### Gaps para estándar profesional (próximas iteraciones)

Estos puntos **no invalidan** el webhook actual, pero son necesarios para un producto Messenger completo:

1. **Suscripción programática tras OAuth**  
   Tras conectar la página, llamar `POST /{page-id}/subscribed_apps?subscribed_fields=messaging,messaging_postbacks,message_deliveries,message_reads` con el page access token. Hoy se asume configuración manual en Meta Developer Console.

2. **Filtrar ecos salientes**  
   Antes de habilitar respuestas, ignorar `message.is_echo === true` para no duplicar mensajes enviados por la página.

3. **Enriquecer contactos**  
   `GET /{psid}?fields=first_name,last_name,profile_pic` con page token para mostrar nombre real en el inbox (hoy solo PSID).

4. **Adjuntos y tipos de mensaje**  
   Hoy el cuerpo es `"[Adjunto]"` genérico. Descargar media vía Graph y mapear `message_type` (image, video, file).

5. **Postbacks, referrals, handover**  
   Procesar eventos sin `message` (quick replies, botones, `messaging_postbacks`).

6. **Ventana de 24 h + etiqueta HUMAN_AGENT**  
   Validar políticas de Messenger antes de enviar fuera de ventana (cuando exista outbound).

**Conclusión:** El webhook unificado es la vía **más eficiente** que polling. Mantener un solo endpoint para WhatsApp, Messenger e Instagram es correcto; optimizar ingest y completar suscripción automática + enriquecimiento de contactos.

---

## 2. Arquitectura futura — Publicaciones en página (imagen + texto)

Diseño propuesto para publicar en una Facebook Page sin implementar aún el código de producción.

### 2.1 Capas

```
┌─────────────────────────────────────────────────────────────┐
│ UI (futuro)                                                 │
│  dashboard/contenido/facebook  →  formulario imagen+texto   │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│ API Routes (App Router)                                     │
│  POST   /api/facebook/posts          → crear publicación    │
│  GET    /api/facebook/posts          → listar por tienda    │
│  GET    /api/facebook/posts/[id]     → detalle + métricas   │
│  DELETE /api/facebook/posts/[id]     → eliminar (opcional)  │
│  POST   /api/integrations/meta/pages/subscribe → webhooks   │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│ Servicios (lib/facebook/)                                   │
│  page-posts.ts      → createPagePhotoPost, createPageFeedPost│
│  page-media.ts      → uploadUnpublishedPhoto (multipart)    │
│  page-subscribe.ts  → subscribePageWebhooks, listFields     │
│  page-token.ts      → resolvePageAccessToken(integrationId) │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│ Persistencia (migración futura)                             │
│  facebook_page_posts                                        │
│    id, store_id, integration_id, page_id, post_id (Graph)   │
│    message, media_url, status, published_at, raw_response   │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Flujo — Publicar imagen + texto

1. **Autenticación:** `requireAuthStore` + verificar `channel_integrations` activa (`provider = messenger`).
2. **Token:** Leer page access token desde `channel_integration_secrets` (ya guardado en OAuth callback).
3. **Subir imagen (si hay archivo):**
   - `POST /{page-id}/photos` con `published=false` → obtiene `id` del photo object.
   - O `POST /{page-id}/photos` multipart con `message` + `source` en una sola llamada (más simple).
4. **Publicar:**
   - Opción A (recomendada): `POST /{page-id}/photos` con `message` + `url` o `source` (multipart).
   - Opción B: `POST /{page-id}/feed` con `message` + `attached_media[0]={"media_fbid":"{photo-id}"}`.
5. **Guardar** fila en `facebook_page_posts` con `post_id` devuelto por Graph.
6. **Responder** `{ postId, permalink_url }` al cliente.

### 2.3 Endpoints (contratos propuestos)

#### `POST /api/facebook/posts`

**Body (multipart/form-data o JSON):**

```json
{
  "message": "Texto de la publicación",
  "imageUrl": "https://...",
  "scheduledPublishTime": null
}
```

**Respuesta 201:**

```json
{
  "postId": "123456789_987654321",
  "permalinkUrl": "https://facebook.com/..."
}
```

#### `POST /api/integrations/meta/pages/subscribe`

Suscribe la página conectada a campos adicionales del webhook (feed, comments, etc.).

```json
{
  "fields": ["messaging", "feed", "comments"]
}
```

### 2.4 Webhooks para engagement (fase 2)

Extender `ingestMetaWebhookPayload()` para `entry.changes[]` cuando `field === "feed"` o `"comments"`:

- Nuevo ingest: `ingestFacebookPageChange()` → alertas en inbox o módulo “Comentarios”.
- Requiere suscripción a `feed` y `comments` en la app de Meta.

### 2.5 Referencia Graph API

| Acción | Endpoint | Permiso típico |
|--------|----------|----------------|
| Publicar foto + texto | `POST /{page-id}/photos` | `pages_manage_posts` |
| Publicar solo texto | `POST /{page-id}/feed` | `pages_manage_posts` |
| Leer métricas del post | `GET /{post-id}/insights` | `pages_read_engagement` |
| Suscribir webhooks de página | `POST /{page-id}/subscribed_apps` | `pages_manage_metadata` |

---

## 3. Permisos Meta (scopes) — Matriz completa

### 3.1 Scopes solicitados hoy (`lib/inbox/meta-oauth.ts`)

| Provider | Scopes actuales |
|----------|-----------------|
| **messenger** | `pages_show_list`, `pages_messaging`, `pages_manage_metadata` |
| instagram | `pages_show_list`, `pages_messaging`, `instagram_basic`, `instagram_manage_messages` |
| whatsapp | `business_management`, `whatsapp_business_management`, `whatsapp_business_messaging` |

### 3.2 Scopes recomendados para Messenger profesional

| Scope | Para qué | Prioridad |
|-------|----------|-----------|
| `pages_show_list` | Listar páginas del usuario en OAuth | ✅ Ya |
| `pages_messaging` | Enviar/recibir mensajes de Messenger | ✅ Ya |
| `pages_manage_metadata` | Suscribir webhooks de página programáticamente | ✅ Ya |
| `pages_read_engagement` | Métricas de posts (reach, reactions, comments count) | 🔜 Publicaciones + analytics |
| `pages_manage_posts` | Crear/editar/eliminar publicaciones en la página | 🔜 Publicaciones |
| `pages_read_user_content` | Leer comentarios y contenido generado por usuarios en la página | 🔜 Moderación comentarios |
| `public_profile` | Identidad básica del usuario que autoriza (opcional) | Opcional |

### 3.3 Scopes propuestos — Messenger ampliado (futuro)

Actualizar `PROVIDER_SCOPES.messenger` a:

```ts
messenger: [
  "pages_show_list",
  "pages_messaging",
  "pages_manage_metadata",
  "pages_read_engagement",   // métricas
  "pages_manage_posts",      // publicar imagen + texto
  "pages_read_user_content", // comentarios en posts
],
```

> **App Review:** `pages_manage_posts` y `pages_read_engagement` requieren revisión de Meta con video demo y caso de uso documentado. Planificar envío antes de habilitar publicaciones en producción.

### 3.4 Permisos de webhook (suscripciones en Developer Console)

| Campo | Uso |
|-------|-----|
| `messages` | WhatsApp Cloud API |
| `messaging` | Messenger + Instagram DMs (objeto `page`) |
| `messaging_postbacks` | Botones y quick replies |
| `message_deliveries` | Confirmación de entrega |
| `message_reads` | Confirmación de lectura |
| `feed` | Nuevas publicaciones y cambios en el muro |
| `comments` | Comentarios en publicaciones de la página |

---

## 4. Variables de entorno

| Variable | Uso |
|----------|-----|
| `META_APP_ID` | OAuth + Graph |
| `META_APP_SECRET` | OAuth, firma webhook, state HMAC |
| `META_WEBHOOK_VERIFY_TOKEN` / `VERIFY_TOKEN` | Verificación GET del webhook |
| `NEXT_PUBLIC_SITE_URL` | Redirect OAuth (`https://www.alcentimo.com`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Ingest webhook con admin client |

**URL de callback en producción:** `https://www.alcentimo.com/api/webhooks/meta`

---

## 5. Archivos relevantes en el repo

| Archivo | Responsabilidad |
|---------|-----------------|
| `app/api/webhooks/meta/route.ts` | Webhook unificado Meta |
| `lib/inbox/meta-webhook.ts` | Firma, parsing, preview |
| `lib/inbox/meta-oauth.ts` | OAuth URL, scopes, state |
| `lib/inbox/meta-graph-api.ts` | Descubrimiento de páginas y tokens |
| `app/api/integrations/meta/connect/route.ts` | Inicio OAuth |
| `app/api/integrations/meta/callback/route.ts` | Fin OAuth + persistencia |
| `lib/inbox/ingest-inbound-message.ts` | Pipeline inbox unificado |
| `src/config/channel-integrations.ts` | Definición canal `messenger` |
| `components/inbox/ChannelBadge.tsx` | Identidad visual FB en lista |
| `components/inbox/MessengerChannelLabel.tsx` | Etiqueta “Facebook Messenger” en chat |

---

## 6. Próximos pasos (orden sugerido)

1. **Corto plazo**
   - [ ] Suscripción automática `subscribed_apps` tras OAuth Messenger
   - [ ] Perfil PSID → `display_name` + `avatar_url` en contactos
   - [ ] Filtrar `is_echo` cuando se implemente outbound
   - [ ] Cliente outbound `lib/inbox/messenger-client.ts` (Send API)

2. **Medio plazo**
   - [ ] Ampliar scopes OAuth + App Review
   - [ ] `POST /api/facebook/posts` + `lib/facebook/page-posts.ts`
   - [ ] Tabla `facebook_page_posts` + UI de publicación

3. **Largo plazo**
   - [ ] Webhooks `feed` / `comments` + moderación
   - [ ] Insights de publicaciones en dashboard
   - [ ] Selector de página (multi-page) en OAuth

---

## 7. Referencias oficiales

- [Messenger Platform — Webhooks](https://developers.facebook.com/docs/messenger-platform/webhooks)
- [Send API](https://developers.facebook.com/docs/messenger-platform/send-messages)
- [Page Photos API](https://developers.facebook.com/docs/graph-api/reference/page/photos)
- [Page Feed API](https://developers.facebook.com/docs/graph-api/reference/page/feed)
- [Permissions Reference](https://developers.facebook.com/docs/permissions/reference)
