export function getSafeRedirectPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";

  // Browsers normalize backslashes and control characters when resolving URLs.
  if (/[\\\u0000-\u0020\u007f]/.test(value)) return "/";

  return value;
}

export function isPasswordRecoveryHash(hash: string) {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  return params.get("type") === "recovery";
}
