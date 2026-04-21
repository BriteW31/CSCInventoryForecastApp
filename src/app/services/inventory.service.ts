import { Injectable } from '@angular/core';
import { CSC } from '../models/csc.models';
import { DataProcessor, CsvRow } from '../utils/data-processor.utils';

@Injectable({
  providedIn: 'root'
})
export class InventoryService {

  constructor() { }


  generateForecast(csvData: CsvRow[], sku: string, location: string, leadTimes: number[], targetRate: number): CSC | null {
    
    // Find the specific row for this SKU/Location
    const itemData = DataProcessor.getForecastData(csvData, sku, location);
    
    if (!itemData) {
      console.error('Item not found in XLSX data.');
      return null; 
    }

    // Create and return the instantiated CSC class
    return new CSC(
      itemData['jan'] || 0, itemData['feb'] || 0, itemData['mar'] || 0, itemData['apr'] || 0,
      itemData['may'] || 0, itemData['jun'] || 0, itemData['jul'] || 0, itemData['aug'] || 0,
      itemData['sep'] || 0, itemData['octo'] || 0, itemData['nov'] || 0, itemData['dec'] || 0,
      itemData['srv'] || 0, targetRate, leadTimes
    );
  }
}
