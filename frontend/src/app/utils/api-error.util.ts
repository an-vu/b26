export function getApiErrorMessage(error: unknown, fallback = 'Request failed.'): string {
  const payload = (error as { error?: { message?: string; errors?: Array<{ message?: string }> } })?.error;

  if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
    const firstMessage = payload.errors[0]?.message?.trim();
    if (firstMessage) {
      return firstMessage;
    }
  }

  const message = payload?.message?.trim();
  return message || fallback;
}
