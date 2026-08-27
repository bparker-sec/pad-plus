import { describe, it, expect } from 'vitest';
import { dedupeLines, sortLines, trimTrailing } from './lineOps';

describe('dedupeLines', () => {
  it('removes duplicates, keeping first occurrence and order', () => {
    expect(dedupeLines(['b', 'a', 'b', 'c', 'a'])).toEqual(['b', 'a', 'c']);
  });

  it('is a no-op when all lines are unique', () => {
    expect(dedupeLines(['1', '2', '3'])).toEqual(['1', '2', '3']);
  });

  it('treats blank lines as duplicates too', () => {
    expect(dedupeLines(['x', '', 'y', '', ''])).toEqual(['x', '', 'y']);
  });

  it('is whitespace- and case-sensitive', () => {
    expect(dedupeLines(['a', 'A', 'a ', 'a'])).toEqual(['a', 'A', 'a ']);
  });

  it('handles the empty input', () => {
    expect(dedupeLines([])).toEqual([]);
  });
});

describe('sortLines', () => {
  it('sorts ascending by default', () => {
    expect(sortLines(['banana', 'apple', 'cherry'])).toEqual([
      'apple',
      'banana',
      'cherry',
    ]);
  });

  it('sorts descending when asked', () => {
    expect(sortLines(['a', 'c', 'b'], { descending: true })).toEqual([
      'c',
      'b',
      'a',
    ]);
  });

  it('does not mutate the input array', () => {
    const input = ['b', 'a'];
    sortLines(input);
    expect(input).toEqual(['b', 'a']);
  });
});

describe('trimTrailing', () => {
  it('strips trailing spaces and tabs only', () => {
    expect(trimTrailing(['a  ', 'b\t', '  c', 'd'])).toEqual([
      'a',
      'b',
      '  c',
      'd',
    ]);
  });
});
