// Define an interface for the loose CSV data structure
export interface CsvRow {
  [key: string]: any;
}

export class DataProcessor {
  
  /**
   * Helper to find a key in an object that matches keywords (case-insensitive partial match)
   */
  static findColumnKey(row: CsvRow, keywords: string[]): string | null {
    const keys = Object.keys(row);
    for (const keyword of keywords) {
      for (const key of keys) {
        const cleanKey = key.trim().toLowerCase();
        // Check for exact match or partial match if keyword is long enough
        if (cleanKey === keyword || (keyword.length > 2 && cleanKey.includes(keyword))) {
          return key;
        }
      }
    }
    return null;
  }

  /**
   * Main logic to process parsed CSV data
   * Matches 'get_forecast_data' in excel.py
   */
  static getForecastData(data: CsvRow[], sku: string, location: string) {
    if (!data || data.length === 0) return null;
    const allHeaders = new Set<string>();
    data.forEach(row => Object.keys(row).forEach(key => allHeaders.add(key)));
    
    // Create a "mock" row containing all possible headers to pass into findColumnKey
    const headerRow: CsvRow = {};
    allHeaders.forEach(key => headerRow[key] = '');

    // Identify Key Columns dynamically based on ALL headers
    const colSku = this.findColumnKey(headerRow, ['sku', 'item', 'item sku', 'skuname']);
    const colLoc = this.findColumnKey(headerRow, ['location', 'loc', 'warehouse']);

    if (!colSku || !colLoc) {
      console.error("Error: Could not identify 'SKU' or 'Location' columns.");
      return null;
    }

    // Identify Month Columns dynamically
    const monthMap: { [key: string]: string } = {};
    const targetMonths = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

    targetMonths.forEach(m => {
      // Logic from python: matches 'jan', 'jan.', 'january', etc.
      const foundCol = this.findColumnKey(headerRow, [
        m, m + '.', m + 'uary', m + 'ruary', m + 'ch', m + 'il', m + 'e', m + 'y', m + 'ust', m + 'ember', m + 'ober'
      ]);
      if (foundCol) {
        monthMap[m] = foundCol;
      }
    });

    // Filter for SKU and Location
    const targetSku = sku.trim().toLowerCase();
    const targetLoc = location.trim().toLowerCase();

    // Filter rows
    let matches = data.filter(row => {
      const rowSku = String(row[colSku] || '').trim().toLowerCase();
      const rowLoc = String(row[colLoc] || '').trim().toLowerCase();
      
      const skuMatch = rowSku === targetSku || rowSku.includes(targetSku);
      const locationMatch = rowLoc === targetLoc;

      // Both conditions must pass for the row to be kept
      return skuMatch && locationMatch;
    });

    if (matches.length === 0) {
      console.error(`Error: SKU '${sku}' at '${location}' not found.`);
      return null;
    }

    // Handle Duplicates: Calculate Total Sales
    // We add a temporary 'calculated_total' property to sort by
    const matchesWithTotal = matches.map(row => {
      let total = 0;
      Object.values(monthMap).forEach(colName => {
        const val = parseFloat(row[colName]);
        if (!isNaN(val)) total += val;
      });
      return { row, total };
    });

    // Sort by total descending (Highest sales first)
    matchesWithTotal.sort((a, b) => b.total - a.total);

    // Pick the winner
    const bestMatch = matchesWithTotal[0].row;

    // Build result object
    const result: { [key: string]: number } = {};
    
    // Map months
    for (const [stdKey, csvCol] of Object.entries(monthMap)) {
      result[stdKey] = parseFloat(bestMatch[csvCol]) || 0;
    }

    // Handle SRV separately
    const colSrv = this.findColumnKey(headerRow, ['srv', 'service', 'van']);
    result['srv'] = colSrv ? (parseFloat(bestMatch[colSrv]) || 0) : 0;

    // Handle 'oct' vs 'octo' mismatch (legacy support for your variable naming)
    if (result['oct'] !== undefined) {
      result['octo'] = result['oct'];
    }

    console.log(`Selected entry with Total Sales: ${matchesWithTotal[0].total}`);
    return result;
  }
}
