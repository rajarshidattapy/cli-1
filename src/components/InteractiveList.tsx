import React from 'react';
import { Box, Text, useInput } from 'ink';
import { Select } from '@inkjs/ui';

export interface InteractiveListItem {
  label: string;
  value: string;
  isCurrent?: boolean;
}

interface InteractiveListProps {
  title: string;
  items: InteractiveListItem[];
  onSelect: (value: string) => void;
  onCancel: () => void;
}

/**
 * Shared interactive list component.
 *
 * Wraps `@inkjs/ui` Select with:
 * - Green dot prefix for the currently active item
 * - defaultValue set to current item (cursor starts there)
 * - Escape key to cancel without changes
 * - Footer legend showing keybindings
 */
export function InteractiveList({
  title,
  items,
  onSelect,
  onCancel,
}: InteractiveListProps): React.ReactElement {
  useInput((_input, key) => {
    if (key.escape) {
      onCancel();
    }
  });

  const currentItem = items.find((item) => item.isCurrent);

  return (
    <Box flexDirection="column" gap={1}>
      <Text bold>{'  '}{title}</Text>
      <Select
        options={items.map((item) => ({
          label: item.isCurrent
            ? `\x1b[32m\u25CF\x1b[39m ${item.label}`
            : `  ${item.label}`,
          value: item.value,
        }))}
        defaultValue={currentItem?.value}
        onChange={onSelect}
      />
      <Text dimColor>
        {'  '}<Text color="green">{'\u25CF'}</Text>{' = current'}
        {'  |  '}<Text>{'\u21B5'}</Text>{' select'}
        {'  |  '}<Text>esc</Text>{' cancel'}
      </Text>
    </Box>
  );
}
