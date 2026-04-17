Hello!

This inventory forecast tool is built from Angular. This can read a local Excel file and user input and outputs an Excel file containing the information.
The purpose of the tool is to create a stockkeeping unit for an item to be able to forecast the next year's inventory. The stockkeeping unit will take in the previous
year's sales, along with some user input, and calculate several crucial factors needed for forecasting. Examples include safety stock quantity, reorder point, and reorder quantities.
The tool then creates an Excel file, which can be downloaded to view all the information of the item(s) you inputted.

To ensure the forecast runs smoothly, please follow these formatting guidelines:

Tab Structure
You do not need to name your tabs a specific way (e.g., "Data" or "Sheet1"). 
When you upload a file, the **Smart Scanner** will quickly peek inside every tab. It will automatically lock onto the first tab that contains both a **SKU** column and a **Location** column.

Required Column Headers
The app looks for specific column headers to map your data. They are not case-sensitive.

* **Part Numbers:** Must be named `SKU`, `Item`, `Item SKU`, or `SkuName`.
* **Location:** Must be named `Location`, `Loc`, `Warehouse`, `Site`, or `Facility`.
* **Sales Data:** Months must be listed sequentially with the year attached (e.g., `Jan-25`, `Feb-25`, `Jan-26`). The app will read the newest dates in the file to build the forecast.

Data Formatting Rules
* **Smart SKU Filtering:** The app can extract part numbers from messy descriptions. For example, if a cell says `KK-10040 - Jet Hurricane`, you can still successfully search for `KK-10040` in the dashboard.
* **Strict Location Filtering:** To ensure accurate warehouse forecasting, the location name must be an exact match (e.g., searching `OAKVILLE` will not match a cell that says `OAK`).
* **Blank Locations (The Default Rule):** If an Excel file is uploaded without a Location column, or if a specific row has a completely blank location cell, the app will automatically default that row to `OAKVILLE`. This can be changed in the dashboard.component.ts file to a preferred location of your choosing.

Example Format
For the fastest and most accurate processing, your raw Excel data should look like this:

| SkuName       | Location   | Jan-25 | Feb-25 | Mar-25 |
|---------------|------------|--------|--------|--------|
| KK-10040      | OAKVILLE   | 96     | 118    | 160    |
| KK-10041      | VANCOUVER  | 98     | 51     | 168    |
| KK-10051      |            | 25     | 8      | 55     | *(Will default to OAKVILLE)*
