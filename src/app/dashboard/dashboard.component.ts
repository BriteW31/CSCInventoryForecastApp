import { Component, ViewChild, ElementRef } from '@angular/core';
import { InventoryService } from '../services/inventory.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CSC } from '../models/csc.models';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  sku: string = ''; 
  location: string = '';
  targetServiceRate: number = 98;
  
  // Type "10, 12, 15..." instead of asking 10 separate times
  leadTimeInput: string = ''; 
  
  csvData: any[] = [];
  parsedFileName: string = '';

  forecast: CSC | null = null;
  errorMessage: string = ''; 

  forecastHistory: { sku: string, location: string, data: CSC }[] = [];

  constructor(private inventoryService: InventoryService) {}

  @ViewChild('fileInput') fileInput!: ElementRef;

  // Handle File Upload
  onFileUpload(event: any) {
    this.errorMessage = '';
    const target: DataTransfer = <DataTransfer>(event.target);
    
    if (target.files.length !== 1) {
      this.errorMessage = 'Cannot use multiple files';
      return;
    }

    const file = target.files[0];
    this.parsedFileName = file.name;

    const reader: FileReader = new FileReader();

    reader.onload = (e: any) => {
      try {
        const arrayBuffer = e.target.result;
        const workbook: XLSX.WorkBook = XLSX.read(arrayBuffer, { type: 'array' });
        
        const sheetNames = workbook.SheetNames;
        let targetSheetName = sheetNames[0];

        for (const sheetName of sheetNames) {
          const tempSheet = workbook.Sheets[sheetName];
          
          const previewData: any[][] = XLSX.utils.sheet_to_json(tempSheet, { header: 1 });
          const firstFewRows = previewData.slice(0, 10);
          
          const previewText = firstFewRows.map(row => row.join(',').toLowerCase()).join(' | ');

          // Require BOTH a SKU identifier AND a Location identifier
          const hasSkuColumn = previewText.includes('sku') || previewText.includes('skuname') || previewText.includes('item');
          const hasLocationColumn = previewText.includes('location') || previewText.includes('loc') || previewText.includes('warehouse');

          if (hasSkuColumn && hasLocationColumn) {
            targetSheetName = sheetName;
            console.log(`Securely locked onto data tab: "${sheetName}"`);
            break; 
          }
        }

        const worksheet: XLSX.WorkSheet = workbook.Sheets[targetSheetName];
        
        const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
        
        if (rawData.length === 0) throw new Error("File is empty.");

        // Utility: Scans the first 10 rows to find which column index holds a keyword
        const findColIdx = (keywords: string[]) => {
          for (let r = 0; r < Math.min(10, rawData.length); r++) {
            if (!rawData[r]) continue;
            
            // Priority Loop: Check the most important keywords first
            for (const kw of keywords) {
              for (let c = 0; c < rawData[r].length; c++) {
                const cellVal = String(rawData[r][c]).trim().toLowerCase();
                if (cellVal === kw || (kw.length > 2 && cellVal.includes(kw))) {
                  return c;
                }
              }
            }
          }
          return -1;
        };

        // Locate the exact column number for every required field
        const skuIdx = findColIdx(['sku', 'item', 'item sku']);
        const locIdx = findColIdx(['location', 'loc', 'warehouse']);
        const srvIdx = findColIdx(['srv', 'service', 'van']);

        const currentYear = new Date().getFullYear(); 
        
        const targetYear = currentYear - 1;           
        
        const targetYearStr = targetYear.toString().slice(-2); 
        const currentYearStr = currentYear.toString().slice(-2);

        const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        const monthIndices: { [key: string]: number } = {};

        // Get the right index by target year
        months.forEach(m => {
          monthIndices[m] = findColIdx([
            `${m}-${targetYearStr}`,
            `${m} ${targetYearStr}`,
            `${m}-${currentYearStr}`,
            `${m}-${targetYear}`,
            m
          ]);
        });
            

        if (skuIdx === -1) {
          this.errorMessage = 'Could not find a column named "SKU" or "Item" in the top 5 rows.';
          return;
        }

        // Loop through the raw data and build clean objects
        const cleanedData: any[] = [];
        
        for (let i = 0; i < rawData.length; i++) {
          const row = rawData[i];
          if (!row || row.length === 0) continue;

          // Extract column headers from string to check if this is an actual data row
          const cellSku = skuIdx < row.length ? String(row[skuIdx]).trim() : '';
          let cellLoc = locIdx !== -1 && locIdx < row.length ? String(row[locIdx]).trim() : '';

          // Default to Oakville if no location found (can be changed)
          if (!cellLoc) {
            cellLoc = 'OAKVILLE';
          }

          // Skip header labels
          if (
            !cellSku 
            || cellSku.toLowerCase() === 'sku' 
            || cellSku.toLowerCase() === 'item'
            || cellSku.toLowerCase() === 'location'
            || cellSku.toLowerCase() === 'month'
            || cellSku.toLowerCase() === 'skuname'
            || cellSku.toLowerCase().includes('monthyear')
            || cellSku.toLowerCase().includes('annual sales')
            || cellSku.toLowerCase().includes('item')
            || cellSku.toLowerCase().includes('location')
          ) {
             continue;
          }

          // Skip rows that do not have a location
          if (locIdx !== -1 && !cellLoc) {
            continue;
          }

          const obj: any = {};
          obj['sku'] = cellSku;
          
          // Location will be the extracted one, or our Oakville default
          obj['location'] = cellLoc; 
          if (srvIdx !== -1 && srvIdx < row.length) obj['srv'] = row[srvIdx];
          
          months.forEach(m => {
            const idx = monthIndices[m];
            obj[m] = (idx !== -1 && idx < row.length) ? row[idx] : 0; 
          });
          
          cleanedData.push(obj);
        }

        this.csvData = cleanedData;
        console.log(`Successfully mapped Data:`, this.csvData);

        if (this.fileInput) {
          this.fileInput.nativeElement.value = '';
        }

      } catch (error: any) {
        this.errorMessage = 'Error parsing Excel file: ' + error.message;
        console.error(error);
      }
    };

    reader.readAsArrayBuffer(file);
  }

  // Run Calculations
  calculate() {
    this.forecastHistory = [];
    this.errorMessage = '';
    this.forecast = null;

    // Convert comma-separated string "10, 12, 14" into number array [10, 12, 14]
    const freshLeadTimesArray = this.leadTimeInput
      .split(',')
      .map(val => Number(val.trim()))
      .filter(val => !isNaN(val));

    if (freshLeadTimesArray.length === 0) {
      this.errorMessage = 'Please enter at least one valid lead time.';
      return;
    }

    if (!this.csvData.length) {
      this.errorMessage = 'Please upload a xlsx file first.';
      return;
    }

    if (this.sku.trim().toUpperCase() === 'ALL') {
      this.processAllSkus(freshLeadTimesArray);
      return;
    }

    // Split the SKU input string by commas and clean up the spaces
    const skuList = this.sku
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (skuList.length === 0) {
      this.errorMessage = 'Please enter at least one valid SKU.';
      return;
    }

    let successCount = 0;
    const notFoundList: string[] = [];

    skuList.forEach(targetSku => {
      const result = this.inventoryService.generateForecast(
        this.csvData,
        targetSku,
        this.location,
        freshLeadTimesArray,
        this.targetServiceRate
      );

      if (result) {
        const isDuplicate = this.forecastHistory.some(
          item => item.sku.toLowerCase() === targetSku.toLowerCase() && item.location.toLowerCase() === this.location.toLowerCase()
        );
        if (!isDuplicate) {
          this.forecastHistory.push({ sku: targetSku, location: this.location, data: result });
        }
        successCount++;
      } else {
        notFoundList.push(targetSku);
      }
    });

    // Update the UI with a status message
    if (successCount > 0) {
      this.errorMessage = `Successfully processed ${successCount} SKU(s).`;
      if (notFoundList.length > 0) {
        this.errorMessage += ` Could not find: ${notFoundList.join(', ')}`;
      }
    } else {
      this.errorMessage = `Could not find any of the requested SKUs at Location "${this.location}".`;
    }
  }

  processAllSkus(leadTimes: number[]) {
    // Gather all headers to dynamically find the SKU and Location columns
    const allHeaders = new Set<string>();
    this.csvData.forEach(row => Object.keys(row).forEach(key => allHeaders.add(key)));
    const headerRow: any = {};
    allHeaders.forEach(key => headerRow[key] = '');

    // Identify the keys
    const skuKey = this.findKey(headerRow, ['sku', 'item', 'item sku']);
    const locKey = this.findKey(headerRow, ['location', 'loc', 'warehouse']);

    if (!skuKey) {
      this.errorMessage = 'Could not identify the SKU column in the uploaded file.';
      return;
    }

    // Extract unique SKU + Location pairs
    const uniqueItems = new Map<string, { sku: string, loc: string }>();
    this.csvData.forEach(row => {
      const rowSku = row[skuKey] ? String(row[skuKey]).trim() : '';
      const rowLoc = (locKey && row[locKey]) ? String(row[locKey]).trim() : '';
      
      if (rowSku) {
        const uniqueKey = `${rowSku}_${rowLoc}`;
        if (!uniqueItems.has(uniqueKey)) {
          uniqueItems.set(uniqueKey, { sku: rowSku, loc: rowLoc });
        }
      }
    });

    // Run the calculation for every unique item
    let successCount = 0;
    uniqueItems.forEach(item => {
      const result = this.inventoryService.generateForecast(
        this.csvData, item.sku, item.loc, leadTimes, this.targetServiceRate
      );

      if (result) {
        const isDuplicate = this.forecastHistory.some(
          historyItem => historyItem.sku === item.sku && historyItem.location === item.loc
        );
        if (!isDuplicate) {
          this.forecastHistory.push({ sku: item.sku, location: item.loc, data: result });
        }
        successCount++;
      }
    });

    // Update the UI
    this.forecast = null;
    this.errorMessage = `Successfully processed ${successCount} SKUs. Scroll down to export them to Excel.`;
  }

  // Helper function to find column names
  private findKey(row: any, keywords: string[]): string | null {
    const keys = Object.keys(row);
    for (const keyword of keywords) {
      for (const key of keys) {
        const cleanKey = key.trim().toLowerCase();
        if (cleanKey === keyword || (keyword.length > 2 && cleanKey.includes(keyword))) {
          return key;
        }
      }
    }
    return null;
  }

  exportToExcel() {
    if (this.forecastHistory.length === 0) return;

    console.log("EXCEL EXPORT TRIGGERED. Current History Array:", this.forecastHistory);

    // Map our history array into columns
    const exportData = this.forecastHistory.map(item => {
      
      // Create the base row 
      const rowData: any = {
        'SKU': item.sku,
        'Location': item.location,
        'Total Sales': item.data.getTotal(),
        'Average Monthly Sales': item.data.getMeanRounded(),
        'Average Daily Sales': item.data.getMeanDailyRounded(),
        'Safety Stock Quantity': item.data.getSafetyStockWithLeadTimeRounded(),
        'Reorder Point': item.data.getReorderPointWithLeadTime()
      };

      // Dynamically generate a new column for each lead time
      const leadTimeDict = item.data.getReorderQuantityNumDays();
      
      Object.entries(leadTimeDict).forEach(([days, qty]) => {
        // This automatically creates column headers like "30 Days Reorder Quantity"
        rowData[`${days} Days Reorder Quantity`] = qty; 
      });

      return rowData;
    });

    // Convert the mapped data to an Excel worksheet
    const worksheet: XLSX.WorkSheet = XLSX.utils.json_to_sheet(exportData);
    
    // Create a new workbook and append the worksheet
    const workbook: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Forecasts');

    // Save the file to the user's computer
    XLSX.writeFile(workbook, 'Inventory_Forecast.xlsx');
  }
}
