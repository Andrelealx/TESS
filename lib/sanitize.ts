const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;

export function sanitizeMessage(input: string, maxLength = 4000): string {
  return input.replace(/\r\n/g, "\n").replace(CONTROL_CHARS, "").trim().slice(0, maxLength);
}

export function sanitizeSingleLine(input: string, maxLength = 120): string {
  return input
    .replace(CONTROL_CHARS, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}
