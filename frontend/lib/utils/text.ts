/** "april" -> "April". Empty/falsy input passes through unchanged. */
export function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}
