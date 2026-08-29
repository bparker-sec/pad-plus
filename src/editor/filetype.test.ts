import { describe, it, expect } from 'vitest';
import {
  sniffContent,
  suggestFileType,
  applyExtension,
  typeForFilename,
  hasExtension,
  SAVE_TYPES,
} from './filetype';

describe('sniffContent', () => {
  it.each([
    ['#!/bin/bash\necho hi', 'shell'],
    ['#!/usr/bin/env bash\n', 'shell'],
    ['#!/bin/sh\n', 'shell'],
    ['#!/usr/bin/env python3\nprint(1)', 'python'],
    ['#!/usr/bin/env node\nconsole.log(1)', 'javascript'],
    ['#!/usr/bin/env ruby\nputs 1', 'ruby'],
    ['#!/usr/bin/perl\n', 'perl'],
    ['<?xml version="1.0"?>\n<root/>', 'xml'],
    ['<?php echo 1; ?>', 'php'],
    ['<!DOCTYPE html>\n<html></html>', 'html'],
    ['<html lang="en"></html>', 'html'],
  ])('detects %j → %s', (content, expected) => {
    expect(sniffContent(content)).toBe(expected);
  });

  it('detects valid JSON but not JSON-like non-JSON', () => {
    expect(sniffContent('{ "a": 1, "b": [2, 3] }')).toBe('json');
    expect(sniffContent('[1, 2, 3]')).toBe('json');
    // JS object literal (unquoted keys) is not valid JSON.
    expect(sniffContent('{ a: 1 }')).not.toBe('json');
  });

  it('strips a leading BOM before matching', () => {
    expect(sniffContent('﻿<?xml version="1.0"?>')).toBe('xml');
  });

  it('detects markdown', () => {
    expect(sniffContent('# Title\n\nSome text')).toBe('markdown');
    expect(sniffContent('See [the docs](https://x.dev) for more.')).toBe(
      'markdown',
    );
  });

  it('detects yaml', () => {
    expect(sniffContent('---\nname: build\non: push')).toBe('yaml');
    expect(sniffContent('host: localhost\nport: 5432\n')).toBe('yaml');
  });

  it('returns null when nothing matches', () => {
    expect(sniffContent('just some plain prose here.')).toBeNull();
    expect(sniffContent('')).toBeNull();
    expect(sniffContent('   \n  \n')).toBeNull();
  });
});

describe('sniffContent — SQL (key use case)', () => {
  it.each([
    ['SELECT id, name FROM users WHERE active = 1;', 'strong: SELECT…FROM'],
    [
      'select * from orders o join items i on i.order_id = o.id',
      'strong: SELECT…FROM',
    ],
    ["INSERT INTO logs (msg) VALUES ('hi');", 'strong: INSERT INTO'],
    ['UPDATE accounts SET balance = 0 WHERE id = 7;', 'strong: UPDATE…SET'],
    ['DELETE FROM sessions WHERE expires < now();', 'strong: DELETE FROM'],
    [
      'CREATE TABLE t (\n  id INT PRIMARY KEY,\n  name TEXT NOT NULL\n);',
      'strong: CREATE TABLE',
    ],
    ['create or replace view v as select 1;', 'strong: CREATE VIEW'],
    ['ALTER TABLE t ADD COLUMN age INT;', 'strong: ALTER TABLE'],
    ['DROP TABLE IF EXISTS temp;', 'strong: DROP TABLE'],
    ['TRUNCATE TABLE staging;', 'strong: TRUNCATE TABLE'],
    ['MERGE INTO target USING src ON target.id = src.id', 'strong: MERGE INTO'],
    [
      'WITH recent AS (\n  SELECT * FROM events\n)\nSELECT * FROM recent;',
      'strong: CTE',
    ],
  ])('detects %j (%s)', (content) => {
    expect(sniffContent(content)).toBe('sql');
  });

  it('detects comment-led scripts via scored signals', () => {
    const script = `-- migration: add index
CREATE INDEX idx_users_email ON users (email);
`;
    expect(sniffContent(script)).toBe('sql');
  });

  it('detects a where + join + terminator combo without a leading keyword', () => {
    const s = 'x\nwhere a.id = b.id\ninner join b on b.k = a.k\nresult;\n';
    expect(sniffContent(s)).toBe('sql');
  });

  it('does not misfire on prose that merely mentions SQL words', () => {
    expect(
      sniffContent('Please select an option from the menu to continue.'),
    ).not.toBe('sql');
    expect(sniffContent('# Notes\n\nWe should update the docs later.')).toBe(
      'markdown',
    );
  });
});

describe('suggestFileType', () => {
  it('respects an explicit known extension in the name', () => {
    const s = suggestFileType({ name: 'report.md', language: 'plaintext' });
    expect(s).toMatchObject({
      ext: 'md',
      langId: 'markdown',
      source: 'filename',
    });
  });

  it('honors a text extension the user typed', () => {
    const s = suggestFileType({ name: 'server.log' });
    expect(s).toMatchObject({ ext: 'log', source: 'filename' });
  });

  it('uses the tab language when the name has no extension', () => {
    const s = suggestFileType({ name: 'new 1', language: 'python' });
    expect(s).toMatchObject({
      ext: 'py',
      langId: 'python',
      source: 'language',
    });
  });

  it('sniffs content when name and language give nothing', () => {
    const s = suggestFileType({
      name: 'new 1',
      language: 'plaintext',
      content: 'SELECT * FROM t;',
    });
    expect(s).toMatchObject({ ext: 'sql', langId: 'sql', source: 'content' });
  });

  it('falls back to plain text', () => {
    const s = suggestFileType({ name: 'new 1', content: 'hello world' });
    expect(s).toMatchObject({
      ext: 'txt',
      langId: 'plaintext',
      source: 'default',
    });
  });

  it('prefers an explicit extension over conflicting content', () => {
    const s = suggestFileType({
      name: 'notes.txt',
      content: 'SELECT 1 FROM t',
    });
    expect(s.ext).toBe('txt');
    expect(s.source).toBe('filename');
  });

  it('carries a friendly label', () => {
    expect(suggestFileType({ name: 'q', language: 'sql' }).label).toBe('SQL');
  });
});

describe('applyExtension', () => {
  it.each([
    ['new 1', 'txt', 'new 1.txt'],
    ['new 1', 'md', 'new 1.md'],
    ['data.json', 'csv', 'data.csv'],
    ['query.SQL', 'sql', 'query.sql'],
    ['config.local', 'txt', 'config.local.txt'],
    ['', 'txt', 'untitled.txt'],
    ['  spaced  ', 'md', 'spaced.md'],
  ])('applyExtension(%j, %j) → %j', (base, ext, expected) => {
    expect(applyExtension(base, ext)).toBe(expected);
  });
});

describe('typeForFilename & hasExtension', () => {
  it('maps a filename to a save type', () => {
    expect(typeForFilename('a.sql')?.label).toBe('SQL');
    expect(typeForFilename('a.md')?.ext).toBe('md');
    expect(typeForFilename('a.xyz')).toBeNull(); // valid-looking ext, not offered
    expect(typeForFilename('noext')).toBeNull();
  });

  it('reports whether a name carries an extension', () => {
    expect(hasExtension('new 1')).toBe(false);
    expect(hasExtension('a.txt')).toBe(true);
    expect(hasExtension('config.local')).toBe(true);
    expect(hasExtension('.env')).toBe(false); // leading-dot dotfile, no ext
  });
});

describe('SAVE_TYPES', () => {
  it('has unique extensions used as the selector key', () => {
    const exts = SAVE_TYPES.map((t) => t.ext);
    expect(new Set(exts).size).toBe(exts.length);
  });
});
