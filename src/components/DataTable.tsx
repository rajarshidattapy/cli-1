import React from 'react';
import { Box, Text } from 'ink';

type Scalar = string | number | boolean | null | undefined;

interface DataTableProps<T extends Record<string, Scalar>> {
  data: T[];
  columns?: (keyof T)[];
}

export function DataTable<T extends Record<string, Scalar>>({
  data,
  columns: columnsProp,
}: DataTableProps<T>): React.ReactElement {
  if (data.length === 0) {
    return (
      <Box marginLeft={2}>
        <Text dimColor>No data to display</Text>
      </Box>
    );
  }

  const columns = (columnsProp || Object.keys(data[0])) as string[];

  // Calculate column widths
  const widths: Record<string, number> = {};
  for (const col of columns) {
    widths[col] = col.length;
    for (const row of data) {
      const val = row[col];
      const len = val === null || val === undefined ? 1 : String(val).length;
      widths[col] = Math.max(widths[col], len);
    }
    // Add padding
    widths[col] += 2;
  }

  function formatCell(value: Scalar, width: number): string {
    if (value === null || value === undefined) {
      return '\u2014'.padEnd(width);
    }
    if (typeof value === 'boolean') {
      return (value ? '\u2713' : '\u2014').padEnd(width);
    }
    return String(value).padEnd(width);
  }

  // Build border strings
  const topBorder =
    '\u250C' + columns.map((c) => '\u2500'.repeat(widths[c])).join('\u252C') + '\u2510';
  const midBorder =
    '\u251C' + columns.map((c) => '\u2500'.repeat(widths[c])).join('\u253C') + '\u2524';
  const bottomBorder =
    '\u2514' + columns.map((c) => '\u2500'.repeat(widths[c])).join('\u2534') + '\u2518';

  return (
    <Box flexDirection="column">
      <Text dimColor>{topBorder}</Text>
      <Text>
        <Text dimColor>{'\u2502'}</Text>
        {columns.map((col) => (
          <React.Fragment key={col}>
            <Text color="cyan">{String(col).padEnd(widths[col])}</Text>
            <Text dimColor>{'\u2502'}</Text>
          </React.Fragment>
        ))}
      </Text>
      <Text dimColor>{midBorder}</Text>
      {data.map((row, rowIndex) => (
        <Text key={rowIndex}>
          <Text dimColor>{'\u2502'}</Text>
          {columns.map((col) => (
            <React.Fragment key={col}>
              <Text>{formatCell(row[col], widths[col])}</Text>
              <Text dimColor>{'\u2502'}</Text>
            </React.Fragment>
          ))}
        </Text>
      ))}
      <Text dimColor>{bottomBorder}</Text>
    </Box>
  );
}
