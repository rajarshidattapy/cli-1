/**
 * Validation tests for src/data/*.json design files
 *
 * Quick build-time guard: ensures data files haven't been corrupted,
 * contain the expected Unlayer design structure, and have no stray keys.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.resolve(__dirname, '..');

const DATA_FILES = ['adventure.json', 'product.json'];

describe.each(DATA_FILES)('data/%s', (filename) => {
  const filePath = path.join(DATA_DIR, filename);

  it('exists on disk', () => {
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('parses as valid JSON', () => {
    const raw = fs.readFileSync(filePath, 'utf-8');
    expect(() => JSON.parse(raw)).not.toThrow();
  });

  it('has a body object', () => {
    const design = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(design).toHaveProperty('body');
    expect(typeof design.body).toBe('object');
    expect(design.body).not.toBeNull();
  });

  it('has body.rows as a non-empty array', () => {
    const design = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(Array.isArray(design.body.rows)).toBe(true);
    expect(design.body.rows.length).toBeGreaterThan(0);
  });

  it('does not have a stray top-level html key', () => {
    const design = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(design).not.toHaveProperty('html');
  });
});

describe('product.json has counters', () => {
  it('includes counters object with expected keys', () => {
    const filePath = path.join(DATA_DIR, 'product.json');
    const design = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    expect(design).toHaveProperty('counters');
    expect(typeof design.counters).toBe('object');
    expect(design.counters).toHaveProperty('u_row');
    expect(design.counters).toHaveProperty('u_column');
  });
});
