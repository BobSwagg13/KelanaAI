import { describe, it, expect } from 'vitest';
import { mapsSearchUrl } from './places';

function queryOf(url: string): string {
  return decodeURIComponent(new URL(url).searchParams.get('query') ?? '');
}

describe('mapsSearchUrl', () => {
  it('should build a Google Maps search URL', () => {
    const url = mapsSearchUrl('Kiyomizu-dera', 'Higashiyama', 'Kyoto', 'Japan');
    expect(url.startsWith('https://www.google.com/maps/search/?api=1&query=')).toBe(true);
    expect(queryOf(url)).toBe('Kiyomizu-dera, Higashiyama, Kyoto, Japan');
  });

  it('should always scope the search to the city and country', () => {
    // A bare "Central Market" would otherwise match one on the wrong continent.
    expect(queryOf(mapsSearchUrl('Central Market', null, 'Lisbon', 'Portugal')))
      .toBe('Central Market, Lisbon, Portugal');
  });

  it('should drop missing parts rather than leaving empty segments', () => {
    expect(queryOf(mapsSearchUrl('Nijo Castle', undefined, 'Kyoto', null)))
      .toBe('Nijo Castle, Kyoto');
  });

  it('should not repeat a term that appears twice', () => {
    // The model often sets location to the city itself.
    expect(queryOf(mapsSearchUrl('Gion Corner', 'Kyoto', 'Kyoto', 'Japan')))
      .toBe('Gion Corner, Kyoto, Japan');
  });

  it('should encode characters that would break the URL', () => {
    const url = mapsSearchUrl('Café & Bar', 'Rue de l’Église', 'Paris', 'France');
    expect(url).not.toContain(' ');
    // The ampersand in the name must not open a third parameter.
    expect([...new URL(url).searchParams.keys()]).toEqual(['api', 'query']);
    expect(queryOf(url)).toBe('Café & Bar, Rue de l’Église, Paris, France');
  });
});
