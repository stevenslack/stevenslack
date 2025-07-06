#!/usr/bin/env node

/**
 * ZHVI Data Comparison Tool
 * 
 * Compares the current ZHVI data with a newly downloaded dataset to show
 * what would change if updated. Useful for understanding Zillow's data
 * revisions before committing to the update.
 * 
 * Usage: node compare-zhvi-updates.js
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const JSON_PATH = join(__dirname, 'avl-county-zhvi.json');
const DOWNLOADED_CSV_PATH = join(__dirname, 'County_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv');
const BUNCOMBE_REGION_ID = '2156';

/**
 * Read current JSON data
 */
function readCurrentData() {
  try {
    if (!existsSync(JSON_PATH)) {
      console.log('❌ No existing JSON file found');
      return {};
    }
    
    const content = readFileSync(JSON_PATH, 'utf8');
    const data = JSON.parse(content);
    
    // Handle both array format and object format
    if (Array.isArray(data) && data.length > 0) {
      return data[0];
    } else if (typeof data === 'object') {
      return data;
    }
    
    return {};
  } catch (error) {
    console.error('❌ Error reading current data:', error.message);
    return {};
  }
}

/**
 * Parse CSV line into array, handling quoted fields
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
  
  result.push(current.trim());
  return result;
}

/**
 * Extract new data from downloaded CSV
 */
function extractNewData() {
  try {
    if (!existsSync(DOWNLOADED_CSV_PATH)) {
      console.log('❌ No downloaded CSV found.');
      console.log('   To download and compare: npm run update-zhvi');
      console.log('   Note: The CSV is automatically cleaned up after processing');
      return {};
    }
    
    console.log('📊 Reading downloaded CSV data...');
    const csvContent = readFileSync(DOWNLOADED_CSV_PATH, 'utf8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      console.log('❌ CSV file is empty');
      return {};
    }
    
    // Parse header to find date columns
    const headers = parseCSVLine(lines[0]);
    const dateColumns = [];
    
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      if (/^\d{4}-\d{2}-\d{2}$/.test(header)) {
        dateColumns.push({ index: i, date: header });
      }
    }
    
    if (dateColumns.length === 0) {
      console.log('❌ No date columns found in CSV');
      return {};
    }
    
    console.log(`Found ${dateColumns.length} date columns`);
    
    // Find Buncombe County row
    let buncombeRow = null;
    for (let i = 1; i < lines.length; i++) {
      const fields = parseCSVLine(lines[i]);
      if (fields[0] === BUNCOMBE_REGION_ID) {
        buncombeRow = fields;
        break;
      }
    }
    
    if (!buncombeRow) {
      console.log('❌ Buncombe County data not found');
      return {};
    }
    
    console.log('✅ Found Buncombe County data');
    
    // Extract data
    const data = {};
    for (const { index, date } of dateColumns) {
      const value = buncombeRow[index];
      if (value && value.trim() !== '' && value !== 'null' && !isNaN(parseFloat(value))) {
        data[date] = parseFloat(value);
      }
    }
    
    return data;
    
  } catch (error) {
    console.error('❌ Error extracting new data:', error.message);
    return {};
  }
}

/**
 * Compare datasets and show differences
 */
function compareData(currentData, newData) {
  console.log('\n📈 Data Comparison Results');
  console.log('═'.repeat(50));
  
  const currentDates = Object.keys(currentData).sort();
  const newDates = Object.keys(newData).sort();
  
  console.log(`Current data points: ${currentDates.length}`);
  console.log(`New data points: ${newDates.length}`);
  
  if (currentDates.length === 0) {
    console.log('\n✨ This appears to be a fresh installation');
    if (newDates.length > 0) {
      console.log(`Will add ${newDates.length} data points`);
      console.log(`Date range: ${newDates[0]} to ${newDates[newDates.length - 1]}`);
    }
    return;
  }
  
  // Find new dates
  const newUniqueDates = newDates.filter(date => !(date in currentData));
  
  // Find updated values
  const updatedDates = newDates.filter(date => 
    date in currentData && currentData[date] !== newData[date]
  );
  
  // Find removed dates (shouldn't happen with Zillow data)
  const removedDates = currentDates.filter(date => !(date in newData));
  
  console.log(`\n🆕 New data points: ${newUniqueDates.length}`);
  if (newUniqueDates.length > 0) {
    console.log('Latest new entries:');
    newUniqueDates.slice(-5).forEach(date => {
      console.log(`  ${date}: $${newData[date].toLocaleString()}`);
    });
  }
  
  console.log(`\n📝 Revised data points: ${updatedDates.length}`);
  if (updatedDates.length > 0) {
    console.log('Recent revisions (Zillow historical adjustments):');
    updatedDates.slice(-10).forEach(date => {
      const oldVal = currentData[date];
      const newVal = newData[date];
      const diff = newVal - oldVal;
      const pctChange = ((diff / oldVal) * 100).toFixed(2);
      console.log(`  ${date}: $${oldVal.toLocaleString()} → $${newVal.toLocaleString()} (${diff >= 0 ? '+' : ''}${diff.toLocaleString()}, ${pctChange}%)`);
    });
    
    console.log('\nℹ️  Historical revisions are normal - Zillow regularly updates past values');
    console.log('   with improved methodology and data quality enhancements.');
  }
  
  if (removedDates.length > 0) {
    console.log(`\n⚠️  Removed data points: ${removedDates.length}`);
    removedDates.slice(0, 5).forEach(date => {
      console.log(`  ${date}: $${currentData[date].toLocaleString()}`);
    });
  }
  
  // Summary
  console.log('\n📊 Summary');
  console.log('─'.repeat(30));
  if (newUniqueDates.length > 0) {
    console.log(`✅ ${newUniqueDates.length} new data point(s) available`);
  }
  if (updatedDates.length > 0) {
    console.log(`📝 ${updatedDates.length} historical revision(s) from Zillow`);
  }
  if (newUniqueDates.length === 0 && updatedDates.length === 0) {
    console.log('✨ Data is already up to date');
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🏠 Zillow ZHVI Data Comparison Tool');
  console.log('Comparing current data with downloaded CSV...\n');
  
  try {
    const currentData = readCurrentData();
    const newData = extractNewData();
    
    if (Object.keys(newData).length === 0) {
      console.log('❌ Could not extract new data. Make sure the CSV was downloaded correctly.');
      process.exit(1);
    }
    
    compareData(currentData, newData);
    
    console.log('\n💡 To apply these updates, run: npm run update-zhvi');
    
  } catch (error) {
    console.error('❌ Error during comparison:', error.message);
    process.exit(1);
  }
}

main();
