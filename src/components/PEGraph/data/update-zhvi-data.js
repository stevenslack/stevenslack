#!/usr/bin/env node

/**
 * Zillow ZHVI Data Update Script
 * 
 * Updates Buncombe County ZHVI (Zillow Home Value Index) data from the latest
 * monthly CSV release. 
 * 
 * IMPORTANT: Zillow regularly revises historical data with each new release.
 * This means values for previous months may change when updated. This is normal
 * and reflects Zillow's ongoing improvements to their valuation methodology,
 * seasonal adjustments, and data quality enhancements.
 * 
 * The script will automatically use the most recent data from Zillow, which
 * represents their best current estimate of historical home values.
 */

import { createWriteStream, readFileSync, writeFileSync, existsSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { pipeline } from 'stream/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const ZILLOW_CSV_URL = 'https://files.zillowstatic.com/research/public_csvs/zhvi/County_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv';
const BUNCOMBE_REGION_ID = '2156';
const BUNCOMBE_REGION_NAME = 'Buncombe County';
const DOWNLOADED_CSV_PATH = join(__dirname, 'County_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv');
const LOCAL_CSV_PATH = join(__dirname, 'avl-county-zhvi.csv');
const JSON_OUTPUT_PATH = join(__dirname, 'avl-county-zhvi.json');

/**
 * Download the Zillow CSV file
 * @returns {Promise<void>}
 */
async function downloadZillowCSV() {
  console.log('Downloading Zillow ZHVI CSV file...');
  
  try {
    const response = await fetch(ZILLOW_CSV_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const fileStream = createWriteStream(DOWNLOADED_CSV_PATH);
    await pipeline(response.body, fileStream);
    
    console.log(`✅ Downloaded CSV file to ${DOWNLOADED_CSV_PATH}`);
  } catch (error) {
    console.error('❌ Error downloading CSV file:', error);
    throw error;
  }
}

/**
 * Parse CSV line into array of values, handling potential commas in quoted fields
 * @param {string} line - CSV line to parse
 * @returns {string[]} Array of values
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add the last field
  result.push(current.trim());
  
  return result;
}

/**
 * Extract Buncombe County data from the downloaded CSV
 * @returns {Object} Parsed Buncombe County data
 */
function extractBuncombeData() {
  console.log('Extracting Buncombe County data from CSV...');
  
  try {
    const csvContent = readFileSync(DOWNLOADED_CSV_PATH, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error('CSV file appears to be empty or invalid');
    }
    
    // Parse header row
    const headers = parseCSVLine(lines[0]);
    console.log(`Found ${headers.length} columns in CSV`);
    
    // Find Buncombe County row
    let buncombeRow = null;
    
    for (let i = 1; i < lines.length; i++) {
      const row = parseCSVLine(lines[i]);
      
      // Check by RegionID or RegionName
      if (row[0] === BUNCOMBE_REGION_ID || row[2] === BUNCOMBE_REGION_NAME) {
        buncombeRow = row;
        console.log(`✅ Found Buncombe County data: RegionID=${row[0]}, RegionName="${row[2]}"`);
        break;
      }
    }
    
    if (!buncombeRow) {
      throw new Error(`Could not find Buncombe County data (RegionID: ${BUNCOMBE_REGION_ID} or RegionName: ${BUNCOMBE_REGION_NAME})`);
    }
    
    // Extract date columns (starting from index 9)
    const dateColumns = headers.slice(9);
    const dataValues = buncombeRow.slice(9);
    
    console.log(`Found ${dateColumns.length} date columns`);
    
    // Create data object
    const data = {};
    
    for (let i = 0; i < dateColumns.length; i++) {
      const date = dateColumns[i];
      const value = dataValues[i];
      
      // Only include non-empty values
      if (value && value.trim() !== '' && value !== 'null' && !isNaN(parseFloat(value))) {
        data[date] = parseFloat(value);
      }
    }
    
    console.log(`✅ Extracted ${Object.keys(data).length} data points`);
    
    // Show date range
    const dates = Object.keys(data).sort();
    if (dates.length > 0) {
      console.log(`   Date range: ${dates[0]} to ${dates[dates.length - 1]}`);
      console.log(`   Latest value: $${data[dates[dates.length - 1]].toLocaleString()}`);
    }
    
    return data;
    
  } catch (error) {
    console.error('❌ Error extracting Buncombe data:', error);
    throw error;
  }
}

/**
 * Update the local CSV file with new data
 * @param {Object} newData - New ZHVI data
 */
function updateLocalCSV(newData) {
  console.log('Updating local CSV file...');
  
  try {
    const dates = Object.keys(newData).sort();
    const values = dates.map(date => newData[date]);
    
    // Create CSV header
    const headers = [
      'RegionID', 'SizeRank', 'RegionName', 'RegionType', 'StateName', 
      'State', 'Metro', 'StateCodeFIPS', 'MunicipalCodeFIPS'
    ].concat(dates);
    
    // Create data row
    const dataRow = [
      BUNCOMBE_REGION_ID, '260', 'Buncombe County', 'county', 'NC', 
      'NC', 'Asheville, NC', '37', '021'
    ].concat(values);
    
    // Write CSV content
    const csvContent = headers.join(',') + '\n' + dataRow.join(',') + '\n';
    writeFileSync(LOCAL_CSV_PATH, csvContent, 'utf8');
    
    console.log(`✅ Updated local CSV file: ${LOCAL_CSV_PATH}`);
    
  } catch (error) {
    console.error('❌ Error updating local CSV:', error);
    throw error;
  }
}

/**
 * Read existing JSON data
 * @returns {Object} Existing data or empty object
 */
function readExistingJSON() {
  try {
    if (existsSync(JSON_OUTPUT_PATH)) {
      const content = readFileSync(JSON_OUTPUT_PATH, 'utf8');
      const data = JSON.parse(content);
      
      // Handle both array format and object format
      if (Array.isArray(data) && data.length > 0) {
        return data[0]; // Take first object from array
      } else if (typeof data === 'object') {
        return data;
      }
    }
    
    return {};
  } catch (error) {
    console.warn('Warning: Could not read existing JSON file, starting fresh', error);
    return {};
  }
}

/**
 * Merge new data with existing data
 * @param {Object} existingData - Current JSON data
 * @param {Object} newData - New ZHVI data from CSV
 * @returns {Object} Merged data
 */
function mergeData(existingData, newData) {
  console.log('Merging new data with existing data...');
  
  const existing = Object.keys(existingData);
  const newKeys = Object.keys(newData);
  
  console.log(`Existing data points: ${existing.length}`);
  console.log(`New data points: ${newKeys.length}`);
  
  // Count truly new data points
  const newUniqueKeys = newKeys.filter(date => !(date in existingData));
  const updatedKeys = newKeys.filter(date => 
    date in existingData && existingData[date] !== newData[date]
  );
  
  console.log(`New data points to add: ${newUniqueKeys.length}`);
  console.log(`Updated data points: ${updatedKeys.length}`);
  
  if (newUniqueKeys.length > 0) {
    console.log('New dates being added:');
    newUniqueKeys.slice(-5).forEach(date => {
      console.log(`  ${date}: $${newData[date].toLocaleString()}`);
    });
  }
  
  if (updatedKeys.length > 0) {
    console.log('📝 Historical data revisions detected (normal Zillow practice):');
    updatedKeys.slice(-5).forEach(date => {
      console.log(`  ${date}: $${existingData[date].toLocaleString()} → $${newData[date].toLocaleString()}`);
    });
    console.log('   ℹ️  Zillow regularly revises historical values with new releases');
    console.log('   ℹ️  This reflects improved methodology and data quality');
  }
  
  // Merge data
  const mergedData = { ...existingData, ...newData };
  
  // Sort keys chronologically
  const sortedData = {};
  Object.keys(mergedData).sort().forEach(date => {
    sortedData[date] = mergedData[date];
  });
  
  return sortedData;
}

/**
 * Write updated JSON data
 * @param {Object} data - Complete merged data
 */
function writeUpdatedJSON(data) {
  console.log('Writing updated JSON file...');
  
  try {
    // Maintain the array format that was in the original file
    const jsonContent = JSON.stringify([data], null, 2);
    writeFileSync(JSON_OUTPUT_PATH, jsonContent, 'utf8');
    
    const dataPoints = Object.keys(data).length;
    console.log(`✅ Updated JSON file with ${dataPoints} total data points`);
    
    // Show latest data
    const dates = Object.keys(data).sort();
    if (dates.length > 0) {
      const latestDate = dates[dates.length - 1];
      const latestValue = data[latestDate];
      console.log(`   Latest data: ${latestDate} = $${latestValue.toLocaleString()}`);
    }
    
  } catch (error) {
    console.error('❌ Error writing JSON file:', error);
    throw error;
  }
}

/**
 * Clean up downloaded file
 */
function cleanup() {
  try {
    if (existsSync(DOWNLOADED_CSV_PATH)) {
      unlinkSync(DOWNLOADED_CSV_PATH);
      console.log(`🗑️  Cleaned up downloaded CSV file (12MB freed)`);
    }
  } catch (error) {
    console.warn('Warning: Could not clean up downloaded file:', error);
  }
}

/**
 * Main function to update ZHVI data
 */
async function updateZHVIData() {
  console.log('🏠 Starting ZHVI data update...\n');
  
  try {
    // Step 1: Download the latest CSV from Zillow
    await downloadZillowCSV();
    
    // Step 2: Extract Buncombe County data
    const newData = extractBuncombeData();
    
    // Step 3: Read existing JSON data
    console.log('\nReading existing JSON data...');
    const existingData = readExistingJSON();
    console.log(`Found ${Object.keys(existingData).length} existing data points`);
    
    // Step 4: Merge data
    const mergedData = mergeData(existingData, newData);
    
    // Step 5: Update local CSV file
    updateLocalCSV(mergedData);
    
    // Step 6: Write updated JSON
    writeUpdatedJSON(mergedData);
    
    // Step 7: Cleanup
    cleanup();
    
    console.log('\n🎉 ZHVI data update completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Failed to update ZHVI data:', error);
    process.exit(1);
  }
}

// Run the update if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  updateZHVIData();
}

export { updateZHVIData };
