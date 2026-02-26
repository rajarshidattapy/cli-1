/**
 * Utility for building padded, column-aligned label strings.
 *
 * Used by InteractiveList to format Select option labels into
 * neatly aligned columns (e.g., name, ID, status).
 */

export interface LabelColumn {
  text: string;
  width: number;
}

/**
 * Build a padded, column-aligned label string.
 *
 * @example
 * formatSelectLabel([
 *   { text: '\u25CF', width: 2 },
 *   { text: 'My Project', width: 20 },
 *   { text: 'ID: 507', width: 12 },
 *   { text: 'LIVE', width: 8 },
 * ])
 * // => "\u25CF My Project           ID: 507      LIVE    "
 */
export function formatSelectLabel(columns: LabelColumn[]): string {
  return columns.map((col) => col.text.padEnd(col.width)).join(' ');
}

/**
 * Sanitize a name for use as a filename.
 *
 * Lowercases the string, replaces non-alphanumeric runs with a
 * single hyphen, and strips leading/trailing hyphens.
 *
 * @example
 * sanitizeName('Welcome Email!')  // => 'welcome-email'
 * sanitizeName('  Hello World  ') // => 'hello-world'
 */
export function sanitizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
