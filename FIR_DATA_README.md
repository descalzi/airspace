# Flight Information Region (FIR) Data

## Overview

This project now includes a complete dataset of 275 Flight Information Regions (FIRs) from around the world, extracted from Wikipedia.

## Data Source

- **Source**: [Wikipedia - List of Flight Information Regions and Area Control Centers](https://en.wikipedia.org/wiki/List_of_flight_information_regions_and_area_control_centers)
- **Last Updated**: November 28, 2025
- **Total FIRs**: 275
- **Countries/Territories**: 167

## Files Added

1. **`src/data/fir_data.json`** - The complete FIR dataset
2. **`src/utils/firLookup.ts`** - Utility functions to query FIR data
3. **`src/utils/firLookup.example.ts`** - Usage examples
4. **`tsconfig.app.json`** - Updated to enable JSON imports

## Data Structure

Each FIR entry contains:

```json
{
  "icao_code": "EGTT",
  "fir_name": "London",
  "acc_name": "London ACC",
  "type": "",
  "country": "United Kingdom"
}
```

## Statistics

- **Total FIRs**: 275
- **Total Countries**: 167
- **Countries with most FIRs**:
  - United States: 24 FIRs
  - Russian Federation: 14 FIRs
  - Argentina: 9 FIRs
  - China: 9 FIRs
  - Canada: 8 FIRs
  - France, Japan, Brazil: 5 FIRs each
  - Germany, Chile: 4 FIRs each

## Usage Examples

### Get FIRs for an Airport's Country

```typescript
import { getFIRsByCountry } from './utils/firLookup';

// When you have an airport with country information
const airport = {
  icao: 'EGLL',
  name: 'London Heathrow',
  country: { name: 'United Kingdom' }
};

const firs = getFIRsByCountry(airport.country.name);
// Returns: [
//   { icao_code: 'EGGX', fir_name: 'Shanwick Oceanic', ... },
//   { icao_code: 'EGPX', fir_name: 'Scottish', ... },
//   { icao_code: 'EGQQ', fir_name: 'Scottish', ... },
//   { icao_code: 'EGTT', fir_name: 'London', ... }
// ]
```

### Get FIR by ICAO Code

```typescript
import { getFIRByICAO } from './utils/firLookup';

const londonFIR = getFIRByICAO('EGTT');
// Returns: { icao_code: 'EGTT', fir_name: 'London', acc_name: 'London ACC', ... }
```

### Get All FIRs and Statistics

```typescript
import { getAllFIRs, getFIRStats } from './utils/firLookup';

const allFIRs = getAllFIRs();
const stats = getFIRStats();

console.log(`Total FIRs: ${stats.totalFIRs}`);
console.log(`Top countries:`, stats.countriesWithMostFIRs);
```

## Integration with NOTAMs Panel

For your NOTAMs panel, you can now:

1. **Get the selected airport's country** (from `airport.country.name`)
2. **Look up FIRs for that country** using `getFIRsByCountry()`
3. **Fetch NOTAMs for each FIR** using the FIR's ICAO code

Example:

```typescript
import { getFIRsByCountry } from '../utils/firLookup';

function NOTAMsPanel({ selectedAirport }) {
  if (!selectedAirport) return null;

  // Get FIRs for the airport's country
  const firs = getFIRsByCountry(selectedAirport.country.name);

  // Fetch NOTAMs for each FIR
  const fetchNOTAMs = async () => {
    const notams = await Promise.all(
      firs.map(fir =>
        fetch(`https://notam-api.example.com/notams/${fir.icao_code}`)
          .then(res => res.json())
      )
    );
    return notams;
  };

  return (
    <div>
      <h3>NOTAMs for {selectedAirport.name}</h3>
      <p>FIRs serving {selectedAirport.country.name}:</p>
      <ul>
        {firs.map(fir => (
          <li key={fir.icao_code}>
            {fir.icao_code}: {fir.fir_name}
          </li>
        ))}
      </ul>
      {/* Display NOTAMs here */}
    </div>
  );
}
```

## Country Matching Notes

The lookup function handles various country name formats:

- **Exact matches**: "United Kingdom" matches "United Kingdom"
- **Partial matches**: "United Kingdom" matches "Bermuda ( United Kingdom)"
- **Case insensitive**: "united kingdom" matches "United Kingdom"

Some FIRs serve multiple countries (e.g., `EGGX: Shanwick Oceanic - United Kingdom/ Ireland`), so you may get FIRs shared between countries.

## Next Steps

1. **Find a NOTAM API** - You'll need an API that provides NOTAMs by FIR ICAO code
2. **Create NOTAMs Panel Component** - Use the examples to build the panel
3. **Handle Multiple FIRs** - Some countries have many FIRs (US has 24!)
4. **Filter NOTAMs** - You may want to filter NOTAMs by relevance to the specific airport
5. **Cache FIR Data** - The data is static, so you can cache lookups

## Data Maintenance

To update the FIR data in the future:

1. Visit the Wikipedia page
2. Run the extraction script (see extraction code in this session)
3. Replace `src/data/fir_data.json` with new data
4. Test the lookup functions still work correctly

## References

- [ICAO Annex 11 - Air Traffic Services](https://www.icao.int/safety/airnavigation/nationalitymarks/annexes_booklet_en.pdf)
- [Wikipedia - Flight Information Region](https://en.wikipedia.org/wiki/Flight_information_region)
- [Wikipedia - List of FIRs and ACCs](https://en.wikipedia.org/wiki/List_of_flight_information_regions_and_area_control_centers)
