"use client";

interface CustomerVerificationFieldsProps {
  documentId: string;
  phone: string;
  businessName: string;
  city: string;
  stateRegion: string;
  socialUrl: string;
  disabled?: boolean;
  idPrefix?: string;
  onDocumentIdChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onBusinessNameChange: (value: string) => void;
  onCityChange: (value: string) => void;
  onStateRegionChange: (value: string) => void;
  onSocialUrlChange: (value: string) => void;
}

/** Campos obligatorios de verificación anti-fraude en registro/perfil de cliente. */
export function CustomerVerificationFields({
  documentId,
  phone,
  businessName,
  city,
  stateRegion,
  socialUrl,
  disabled = false,
  idPrefix = "customer",
  onDocumentIdChange,
  onPhoneChange,
  onBusinessNameChange,
  onCityChange,
  onStateRegionChange,
  onSocialUrlChange,
}: CustomerVerificationFieldsProps) {
  return (
    <fieldset className="space-y-4 border-0 p-0">
      <legend className="sr-only">Datos de verificación</legend>

      <div>
        <label htmlFor={`${idPrefix}_document_id`} className="label-field">
          Cédula de Identidad / RIF
        </label>
        <input
          id={`${idPrefix}_document_id`}
          name="documentId"
          type="text"
          autoComplete="off"
          required
          value={documentId}
          disabled={disabled}
          onChange={(event) => onDocumentIdChange(event.target.value)}
          className="input-field"
          placeholder="V-12345678 o J-123456789"
        />
      </div>

      <div>
        <label htmlFor={`${idPrefix}_phone`} className="label-field">
          Número de WhatsApp / Teléfono
        </label>
        <input
          id={`${idPrefix}_phone`}
          name="phone"
          type="tel"
          autoComplete="tel"
          required
          value={phone}
          disabled={disabled}
          onChange={(event) => onPhoneChange(event.target.value)}
          className="input-field"
          placeholder="0412… o 412…"
        />
      </div>

      <div>
        <label htmlFor={`${idPrefix}_business_name`} className="label-field">
          Nombre de la tienda
        </label>
        <input
          id={`${idPrefix}_business_name`}
          name="businessName"
          type="text"
          autoComplete="organization"
          required
          minLength={2}
          value={businessName}
          disabled={disabled}
          onChange={(event) => onBusinessNameChange(event.target.value)}
          className="input-field"
          placeholder="Tu tienda o negocio"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor={`${idPrefix}_city`} className="label-field">
            Ciudad
          </label>
          <input
            id={`${idPrefix}_city`}
            name="city"
            type="text"
            autoComplete="address-level2"
            required
            minLength={2}
            value={city}
            disabled={disabled}
            onChange={(event) => onCityChange(event.target.value)}
            className="input-field"
            placeholder="Caracas"
          />
        </div>
        <div>
          <label htmlFor={`${idPrefix}_state`} className="label-field">
            Estado
          </label>
          <input
            id={`${idPrefix}_state`}
            name="state"
            type="text"
            autoComplete="address-level1"
            required
            minLength={2}
            value={stateRegion}
            disabled={disabled}
            onChange={(event) => onStateRegionChange(event.target.value)}
            className="input-field"
            placeholder="Distrito Capital"
          />
        </div>
      </div>

      <div>
        <label htmlFor={`${idPrefix}_social_url`} className="label-field">
          Enlace de red social
        </label>
        <input
          id={`${idPrefix}_social_url`}
          name="socialUrl"
          type="text"
          autoComplete="url"
          required
          value={socialUrl}
          disabled={disabled}
          onChange={(event) => onSocialUrlChange(event.target.value)}
          className="input-field"
          placeholder="@tu.tienda o instagram.com/tu.tienda"
        />
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Instagram u otro perfil comercial para verificar tu identidad.
        </p>
      </div>
    </fieldset>
  );
}
