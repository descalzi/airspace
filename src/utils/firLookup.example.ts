/**
 * Example usage of FIR lookup utilities
 *
 * This file demonstrates how to use the FIR lookup functions
 * in the NOTAMs panel or other components.
 */

import { getFIRsByCountry, getFIRByICAO, getFIRStats } from './firLookup';

// Example 1: Get FIRs for an airport's country
// In your NOTAMs panel, when you have an airport object:
function exampleGetFIRsForAirport() {
  // Assuming you have an airport object with country.name
  const airport = {
    icao: 'EGLL',  // London Heathrow
    name: 'London Heathrow',
    country: {
      name: 'United Kingdom'
    }
  };

  // Get all FIRs that serve this country
  const firs = getFIRsByCountry(airport.country.name);

  console.log(`FIRs for ${airport.country.name}:`);
  firs.forEach(fir => {
    console.log(`  ${fir.icao_code}: ${fir.fir_name} (${fir.acc_name})`);
  });

  /*
   * Output:
   * FIRs for United Kingdom:
   *   EGGX: Shanwick Oceanic (Shanwick Oceanic ACC)
   *   EGPX: Scottish (Scottish ACC)
   *   EGQQ: Scottish (Scottish ACC)
   *   EGTT: London (London ACC)
   */

  return firs;
}

// Example 2: Get FIR by ICAO code
function exampleGetFIRByCode() {
  const fir = getFIRByICAO('EGTT');

  if (fir) {
    console.log('Found FIR:');
    console.log(`  Code: ${fir.icao_code}`);
    console.log(`  Name: ${fir.fir_name}`);
    console.log(`  ACC: ${fir.acc_name}`);
    console.log(`  Country: ${fir.country}`);
  }

  /*
   * Output:
   * Found FIR:
   *   Code: EGTT
   *   Name: London
   *   ACC: London ACC
   *   Country: United Kingdom
   */

  return fir;
}

// Example 3: Display FIR statistics
function exampleShowStats() {
  const stats = getFIRStats();

  console.log('FIR Statistics:');
  console.log(`Total FIRs: ${stats.totalFIRs}`);
  console.log(`Total Countries: ${stats.totalCountries}`);
  console.log('\nTop 10 countries by FIR count:');
  stats.countriesWithMostFIRs.forEach(({ country, count }) => {
    console.log(`  ${country}: ${count}`);
  });

  /*
   * Output:
   * FIR Statistics:
   * Total FIRs: 275
   * Total Countries: 167
   *
   * Top 10 countries by FIR count:
   *   United States: 24
   *   Russian Federation: 14
   *   Argentina: 9
   *   China: 9
   *   Canada: 8
   *   ...
   */

  return stats;
}

// Example 4: Integration with NOTAMs panel
// This is how you might use it in your NOTAMs panel component
interface NOTAMsPanelProps {
  selectedAirport?: {
    icao: string;
    name: string;
    country: {
      name: string;
    };
  };
}

function exampleNOTAMsPanelIntegration(props: NOTAMsPanelProps) {
  const { selectedAirport } = props;

  if (!selectedAirport) {
    return {
      message: 'No airport selected',
      firs: []
    };
  }

  // Get FIRs for the airport's country
  const firs = getFIRsByCountry(selectedAirport.country.name);

  // Now you can fetch NOTAMs for each FIR
  // Example NOTAM API URLs (you'll need actual NOTAM API):
  const notamRequests = firs.map(fir => ({
    firCode: fir.icao_code,
    firName: fir.fir_name,
    // url: `https://notam-api.example.com/notams/${fir.icao_code}`
  }));

  console.log(`Found ${firs.length} FIRs for ${selectedAirport.country.name}`);
  console.log('NOTAM requests to make:', notamRequests);

  return {
    airport: selectedAirport,
    firs,
    notamRequests
  };
}

// Export examples for testing
export {
  exampleGetFIRsForAirport,
  exampleGetFIRByCode,
  exampleShowStats,
  exampleNOTAMsPanelIntegration
};
