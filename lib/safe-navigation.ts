// Backslashes become slashes in browser URLs; reject them before navigation.
export function safeInternalPath(value: string | null | undefined, fallback = '/dashboard') {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020\u007f]/.test(value)) return fallback
  return value
}
