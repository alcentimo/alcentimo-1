/** Marca post-login para mostrar avisos una sola vez al entrar al panel. */
export const POST_LOGIN_NOTIFY_STORAGE_KEY = "alcentimo_post_login_notify";

export function markPostLoginNotify(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(POST_LOGIN_NOTIFY_STORAGE_KEY, "1");
  } catch {
    // sessionStorage puede fallar en modo privado estricto.
  }
}

export function consumePostLoginNotify(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const value = sessionStorage.getItem(POST_LOGIN_NOTIFY_STORAGE_KEY);
    if (value !== "1") return false;
    sessionStorage.removeItem(POST_LOGIN_NOTIFY_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
