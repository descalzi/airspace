/**
 * FIR (Flight Information Region) Lookup Utilities
 *
 * This module provides utilities to match airports to their Flight Information Regions
 * based on country information.
 */

import firData from '../data/fir_data.json';

export interface FIR {
  icao_code: string;
  fir_name: string;
  acc_name: string;
  type: string;
  country: string;
}

/**
 * Get all FIRs for a given country name
 * @param countryName - The country name from airport.country.name
 * @returns Array of FIRs that serve that country
 */
export function getFIRsByCountry(countryName: string): FIR[] {
  if (!countryName) return [];

  const normalizedSearch = countryName.toLowerCase().trim();

  return (firData as FIR[]).filter(fir => {
    const normalizedFirCountry = fir.country.toLowerCase();

    // Exact match
    if (normalizedFirCountry === normalizedSearch) {
      return true;
    }

    // Partial match - handles cases like "United Kingdom" in "Bermuda ( United Kingdom)"
    if (normalizedFirCountry.includes(normalizedSearch)) {
      return true;
    }

    // Check if search term is in the country field
    if (normalizedSearch && normalizedFirCountry.includes(normalizedSearch)) {
      return true;
    }

    return false;
  });
}

/**
 * Get a FIR by its ICAO code
 * @param icaoCode - The ICAO code (e.g., "EGTT" for London)
 * @returns The FIR object or undefined if not found
 */
export function getFIRByICAO(icaoCode: string): FIR | undefined {
  if (!icaoCode) return undefined;

  const normalizedCode = icaoCode.toUpperCase().trim();
  return (firData as FIR[]).find(fir => fir.icao_code === normalizedCode);
}

/**
 * Get all FIRs
 * @returns Array of all FIR objects
 */
export function getAllFIRs(): FIR[] {
  return firData as FIR[];
}

/**
 * Get unique list of countries that have FIRs
 * @returns Array of country names
 */
export function getAllCountries(): string[] {
  const countries = new Set((firData as FIR[]).map(fir => fir.country));
  return Array.from(countries).sort();
}

/**
 * Get statistics about FIR coverage
 * @returns Object with FIR statistics
 */
export function getFIRStats() {
  const firs = firData as FIR[];
  const countries = getAllCountries();

  // Count FIRs per country
  const firsByCountry: Record<string, number> = {};
  firs.forEach(fir => {
    firsByCountry[fir.country] = (firsByCountry[fir.country] || 0) + 1;
  });

  return {
    totalFIRs: firs.length,
    totalCountries: countries.length,
    firsByCountry,
    countriesWithMostFIRs: Object.entries(firsByCountry)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([country, count]) => ({ country, count }))
  };
}
