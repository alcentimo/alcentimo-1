/** Acceso al hub de mayoristas / proveedores (carga de productos). */
export const SUPPLIER_DASHBOARD_PATH = "/proveedor/dashboard";

/** Registro self-serve de proveedores / mayoristas. */
export const SUPPLIER_REGISTER_PATH = "/proveedor/registro";

/** Entrada principal desde la landing (registro). */
export const SUPPLIER_ZONE_HREF = SUPPLIER_REGISTER_PATH;

/** Alias de registro (CTAs “Soy proveedor”). */
export const SUPPLIER_SIGNUP_HREF = SUPPLIER_REGISTER_PATH;

/** Login con destino al panel de proveedores. */
export const SUPPLIER_LOGIN_HREF = `/dashboard/login?next=${encodeURIComponent(SUPPLIER_DASHBOARD_PATH)}`;
