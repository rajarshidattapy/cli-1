/**
 * Structural diff engine for Unlayer design objects.
 *
 * Compares by design structure (rows -> columns -> content blocks),
 * not raw JSON — producing human-readable paths like
 * "Row 1 > Column 1 > Text Block".
 */

export interface DesignDiffChange {
  type: 'added' | 'removed' | 'changed';
  path: string; // "Row 1 > Column 1 > Text Block"
  section: 'rows' | 'content' | 'settings' | 'body';
  details?: string;
  before?: unknown;
  after?: unknown;
}

export interface DesignDiffResult {
  templateId: string;
  templateName?: string;
  totalChanges: number;
  changes: DesignDiffChange[];
  summary: {
    rowsAdded: number;
    rowsRemoved: number;
    rowsChanged: number;
    contentAdded: number;
    contentRemoved: number;
    contentChanged: number;
    settingsChanged: number;
  };
}

interface DesignBody {
  rows?: DesignRow[];
  values?: Record<string, unknown>;
  [key: string]: unknown;
}

interface DesignRow {
  cells?: number[];
  columns?: DesignColumn[];
  values?: Record<string, unknown>;
  [key: string]: unknown;
}

interface DesignColumn {
  contents?: DesignContent[];
  values?: Record<string, unknown>;
  [key: string]: unknown;
}

interface DesignContent {
  type?: string;
  values?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Serialize a value for equality comparison.
 */
function serialize(value: unknown): string {
  return JSON.stringify(value);
}

/**
 * Compare two objects key-by-key and return changed keys.
 */
function diffValues(
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown> | undefined,
): Array<{ key: string; before: unknown; after: unknown }> {
  const changes: Array<{ key: string; before: unknown; after: unknown }> = [];
  const allKeys = new Set([
    ...Object.keys(before || {}),
    ...Object.keys(after || {}),
  ]);

  for (const key of allKeys) {
    const bVal = before?.[key];
    const aVal = after?.[key];
    if (serialize(bVal) !== serialize(aVal)) {
      changes.push({ key, before: bVal, after: aVal });
    }
  }

  return changes;
}

/**
 * Summarize a value for display (truncate long strings).
 */
function summarizeValue(value: unknown): string {
  if (value === undefined) return '(undefined)';
  if (value === null) return 'null';
  if (typeof value === 'string') {
    return value.length > 60 ? `"${value.slice(0, 57)}..."` : `"${value}"`;
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  const s = JSON.stringify(value);
  return s.length > 60 ? s.slice(0, 57) + '...' : s;
}

/**
 * Get a human-friendly name for a content block type.
 */
function contentTypeName(type?: string): string {
  if (!type) return 'Content Block';
  const names: Record<string, string> = {
    text: 'Text Block',
    image: 'Image Block',
    button: 'Button Block',
    divider: 'Divider',
    html: 'HTML Block',
    heading: 'Heading Block',
    social: 'Social Block',
    video: 'Video Block',
    menu: 'Menu Block',
    timer: 'Timer Block',
  };
  return names[type] || `${type.charAt(0).toUpperCase() + type.slice(1)} Block`;
}

/**
 * Diff two Unlayer design objects structurally.
 */
export function diffDesigns(
  local: object,
  remote: object,
  meta?: { templateId: string; templateName?: string },
): DesignDiffResult {
  const changes: DesignDiffChange[] = [];
  const summary = {
    rowsAdded: 0,
    rowsRemoved: 0,
    rowsChanged: 0,
    contentAdded: 0,
    contentRemoved: 0,
    contentChanged: 0,
    settingsChanged: 0,
  };

  const localBody = (local as { body?: DesignBody }).body || (local as DesignBody);
  const remoteBody = (remote as { body?: DesignBody }).body || (remote as DesignBody);

  // 1. Body settings (body.values)
  const bodyValueChanges = diffValues(
    localBody.values as Record<string, unknown> | undefined,
    remoteBody.values as Record<string, unknown> | undefined,
  );
  for (const change of bodyValueChanges) {
    summary.settingsChanged++;
    changes.push({
      type: 'changed',
      path: `Body Settings > ${change.key}`,
      section: 'settings',
      details: `${summarizeValue(change.before)} -> ${summarizeValue(change.after)}`,
      before: change.before,
      after: change.after,
    });
  }

  // 2. Rows
  const localRows = localBody.rows || [];
  const remoteRows = remoteBody.rows || [];
  const maxRows = Math.max(localRows.length, remoteRows.length);

  for (let r = 0; r < maxRows; r++) {
    const localRow = localRows[r];
    const remoteRow = remoteRows[r];
    const rowLabel = `Row ${r + 1}`;

    // Row only in local (added locally / removed remotely)
    if (localRow && !remoteRow) {
      summary.rowsAdded++;
      changes.push({
        type: 'added',
        path: rowLabel,
        section: 'rows',
        details: 'New row (exists locally, not in remote)',
      });
      continue;
    }

    // Row only in remote (removed locally)
    if (!localRow && remoteRow) {
      summary.rowsRemoved++;
      changes.push({
        type: 'removed',
        path: rowLabel,
        section: 'rows',
        details: 'Row removed (exists in remote, not locally)',
      });
      continue;
    }

    // Both exist — compare row values
    const rowValueChanges = diffValues(
      localRow.values as Record<string, unknown> | undefined,
      remoteRow.values as Record<string, unknown> | undefined,
    );
    if (rowValueChanges.length > 0) {
      summary.rowsChanged++;
      for (const change of rowValueChanges) {
        changes.push({
          type: 'changed',
          path: `${rowLabel} > ${change.key}`,
          section: 'rows',
          details: `${summarizeValue(change.before)} -> ${summarizeValue(change.after)}`,
          before: change.before,
          after: change.after,
        });
      }
    }

    // 3. Columns within row
    const localCols = localRow.columns || [];
    const remoteCols = remoteRow.columns || [];
    const maxCols = Math.max(localCols.length, remoteCols.length);

    for (let c = 0; c < maxCols; c++) {
      const localCol = localCols[c];
      const remoteCol = remoteCols[c];
      const colLabel = `${rowLabel} > Column ${c + 1}`;

      if (localCol && !remoteCol) {
        summary.contentAdded++;
        changes.push({
          type: 'added',
          path: colLabel,
          section: 'content',
          details: 'New column added',
        });
        continue;
      }

      if (!localCol && remoteCol) {
        summary.contentRemoved++;
        changes.push({
          type: 'removed',
          path: colLabel,
          section: 'content',
          details: 'Column removed',
        });
        continue;
      }

      // Compare column values
      const colValueChanges = diffValues(
        localCol.values as Record<string, unknown> | undefined,
        remoteCol.values as Record<string, unknown> | undefined,
      );
      for (const change of colValueChanges) {
        summary.contentChanged++;
        changes.push({
          type: 'changed',
          path: `${colLabel} > ${change.key}`,
          section: 'content',
          details: `${summarizeValue(change.before)} -> ${summarizeValue(change.after)}`,
          before: change.before,
          after: change.after,
        });
      }

      // 4. Content blocks within column
      const localContents = localCol.contents || [];
      const remoteContents = remoteCol.contents || [];
      const maxContents = Math.max(localContents.length, remoteContents.length);

      for (let b = 0; b < maxContents; b++) {
        const localBlock = localContents[b];
        const remoteBlock = remoteContents[b];

        if (localBlock && !remoteBlock) {
          summary.contentAdded++;
          changes.push({
            type: 'added',
            path: `${colLabel} > ${contentTypeName(localBlock.type)}`,
            section: 'content',
            details: 'New content block added',
          });
          continue;
        }

        if (!localBlock && remoteBlock) {
          summary.contentRemoved++;
          changes.push({
            type: 'removed',
            path: `${colLabel} > ${contentTypeName(remoteBlock.type)}`,
            section: 'content',
            details: 'Content block removed',
          });
          continue;
        }

        // Type changed
        if (localBlock.type !== remoteBlock.type) {
          summary.contentChanged++;
          changes.push({
            type: 'changed',
            path: `${colLabel} > Block ${b + 1}`,
            section: 'content',
            details: `Type changed: ${localBlock.type} -> ${remoteBlock.type}`,
            before: localBlock.type,
            after: remoteBlock.type,
          });
          continue;
        }

        // Compare content block values
        const blockValueChanges = diffValues(
          localBlock.values as Record<string, unknown> | undefined,
          remoteBlock.values as Record<string, unknown> | undefined,
        );
        for (const change of blockValueChanges) {
          summary.contentChanged++;
          changes.push({
            type: 'changed',
            path: `${colLabel} > ${contentTypeName(localBlock.type)} > ${change.key}`,
            section: 'content',
            details: `${summarizeValue(change.before)} -> ${summarizeValue(change.after)}`,
            before: change.before,
            after: change.after,
          });
        }
      }
    }
  }

  return {
    templateId: meta?.templateId || '',
    templateName: meta?.templateName,
    totalChanges: changes.length,
    changes,
    summary,
  };
}
