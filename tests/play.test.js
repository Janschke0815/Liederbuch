import { describe, it, expect } from './runner.js';
import { durationSeconds } from '../src/play-mode.js';

describe('Spielmodus', () => {
  it('Liedlänge aus {duration}', () => {
    expect(durationSeconds('3:20')).toBe(200);
    expect(durationSeconds('95')).toBe(95);
    expect(durationSeconds('')).toBe(null);
    expect(durationSeconds('lang')).toBe(null);
  });
});
