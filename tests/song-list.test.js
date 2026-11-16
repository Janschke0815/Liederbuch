import { describe, it, expect } from './runner.js';
import { sortSongs, letterOf, songKey, findDuplicates, SORT_MODES } from '../src/core/song-list.js';

const songs = [
  { id: 'a', title: 'Zebra', artist: 'Abba', sortTitle: 'Zebra', updatedAt: '2026-01-01T00:00:00Z' },
  { id: 'b', title: 'Apfel', artist: '', sortTitle: 'Apfel', updatedAt: '2026-03-01T00:00:00Z' },
  { id: 'c', title: 'Mond', artist: 'Cash', sortTitle: 'Mond', updatedAt: '2026-02-01T00:00:00Z' },
];
const ids = (list) => list.map((s) => s.id).join('');

describe('Liste sortieren', () => {
  it('nach Titel (Standard)', () => expect(ids(sortSongs(songs))).toBe('bca'));
  it('nach Interpret, ohne Interpret ans Ende', () => expect(ids(sortSongs(songs, 'artist'))).toBe('acb'));
  it('zuletzt geändert zuerst', () => expect(ids(sortSongs(songs, 'updated'))).toBe('bca'));
  it('zuletzt gespielt zuerst, nie Gespieltes nach Titel', () => {
    expect(ids(sortSongs(songs, 'played', { a: '2026-05-01T00:00:00Z', c: '2026-04-01T00:00:00Z' }))).toBe('acb');
  });
  it('ändert die Eingabe nicht', () => {
    sortSongs(songs, 'artist');
    expect(ids(songs)).toBe('abc');
  });
  it('kennt vier Sortierungen', () => expect(Object.keys(SORT_MODES)).toEqual(['title', 'artist', 'updated', 'played']));
  it('Anfangsbuchstabe', () => {
    expect(letterOf('Ärger')).toBe('A');
    expect(letterOf('99 Luftballons')).toBe('#');
    expect(letterOf('')).toBe('#');
  });
});

describe('Doppelte Lieder', () => {
  const book = [
    { id: '1', title: 'Hallelujah', artist: 'Leonard Cohen' },
    { id: '2', title: 'The Boxer', artist: 'Simon & Garfunkel' },
    { id: '3', title: 'Ohne Interpret', artist: '' },
  ];
  it('Schreibweise egal', () => {
    expect(songKey('Hallelujah (Live)')).toBe('hallelujah');
    expect(songKey('Café  del Mar!')).toBe('cafe del mar');
    expect(findDuplicates(book, { title: 'HALLELUJAH', artist: 'leonard cohen' }).map((s) => s.id)).toEqual(['1']);
  });
  it('anderer Interpret = anderes Lied', () => {
    expect(findDuplicates(book, { title: 'Hallelujah', artist: 'Jeff Buckley' })).toEqual([]);
  });
  it('fehlt ein Interpret, zählt nur der Titel', () => {
    expect(findDuplicates(book, { title: 'Hallelujah', artist: '' }).length).toBe(1);
    expect(findDuplicates(book, { title: 'Ohne Interpret', artist: 'Jemand' }).length).toBe(1);
  });
  it('„The“ am Anfang und Zusätze in Klammern zählen nicht', () => {
    expect(findDuplicates(book, { title: 'Boxer [Acoustic]', artist: 'Simon & Garfunkel' }).length).toBe(1);
  });
  it('ohne Titel nie doppelt', () => expect(findDuplicates(book, { title: '', artist: '' })).toEqual([]));
});
