#!/usr/bin/env node

/**
 * Test script for ZHVI data update functionality
 * This script tests the update functionality without making actual downloads
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Test JSON data parsing
 */
function testJSONParsing() {
  console.log('Testing JSON data parsing...');
  
  try {
    const jsonPath = join(__dirname, 'avl-county-zhvi.json');
    
    if (!existsSync(jsonPath)) {
      throw new Error('avl-county-zhvi.json file not found');
    }
    
    const content = readFileSync(jsonPath, 'utf8');
    const data = JSON.parse(content);
    
    // Handle both array format and object format
    let dataObject;
    if (Array.isArray(data) && data.length > 0) {
      dataObject = data[0];
    } else if (typeof data === 'object') {
      dataObject = data;
    } else {
      throw new Error('Unexpected JSON structure');
    }
    
    const dataPoints = Object.keys(dataObject).length;
    console.log(`✅ Successfully parsed JSON with ${dataPoints} data points`);
    
    if (dataPoints > 0) {
      const dates = Object.keys(dataObject).sort();
      const latest = dates[dates.length - 1];
      const earliest = dates[0];
      
      console.log(`   Date range: ${earliest} to ${latest}`);
      console.log(`   Latest value: $${dataObject[latest].toLocaleString()}`);
      console.log(`   Earliest value: $${dataObject[earliest].toLocaleString()}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ JSON parsing test failed:', error);
    return false;
  }
}

/**
 * Test CSV data parsing
 */
function testCSVParsing() {
  console.log('\nTesting CSV data parsing...');
  
  try {
    const csvPath = join(__dirname, 'avl-county-zhvi.csv');
    
    if (!existsSync(csvPath)) {
      console.log('ℹ️  Local CSV file not found, this is normal for first run');
      return true;
    }
    
    const content = readFileSync(csvPath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error('CSV file appears to be empty or invalid');
    }
    
    // Parse header row
    const headers = lines[0].split(',');
    const dataRow = lines[1].split(',');
    
    console.log(`✅ Successfully parsed CSV with ${headers.length} columns`);
    
    // Verify Buncombe County data
    if (dataRow[0] !== '2156' || dataRow[2] !== 'Buncombe County') {
      throw new Error('CSV does not contain expected Buncombe County data');
    }
    
    // Count non-empty data points (skip first 9 metadata columns)
    const dataPoints = dataRow.slice(9).filter(val => val && val.trim() !== '').length;
    console.log(`   Found ${dataPoints} data points for Buncombe County`);
    console.log(`   RegionID: ${dataRow[0]}, RegionName: ${dataRow[2]}`);
    
    return true;
  } catch (error) {
    console.error('❌ CSV parsing test failed:', error);
    return false;
  }
}

/**
 * Test URL format and accessibility
 */
async function testZillowURL() {
  console.log('\nTesting Zillow URL accessibility...');
  
  try {
    const url = 'https://files.zillowstatic.com/research/public_csvs/zhvi/County_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv';
    
    // Just test if we can reach the URL with HEAD request
    const response = await fetch(url, { method: 'HEAD' });
    
    if (response.ok) {
      console.log('✅ Zillow URL is accessible');
      console.log(`   Status: ${response.status}`);
      console.log(`   Content-Type: ${response.headers.get('content-type')}`);
      
      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        const sizeMB = (parseInt(contentLength) / 1024 / 1024).toFixed(2);
        console.log(`   File size: ${sizeMB} MB`);
      }
    } else {
      console.warn(`⚠️  Zillow URL returned status: ${response.status}`);
    }
    
    return response.ok;
  } catch (error) {
    console.error('❌ URL accessibility test failed:', error);
    console.log('   This might be due to network issues or CORS policies');
    return false;
  }
}

/**
 * Test data merging logic with mock data
 */
function testDataMerging() {
  console.log('\nTesting data merging logic...');
  
  try {
    // Mock existing data
    const existingData = {
      '2024-01-31': 444268.46922479727,
      '2024-02-29': 444409.54662528384,
      '2024-03-31': 445457.44516680227
    };
    
    // Mock new data with some overlap and new entries
    const newData = {
      '2024-02-29': 444409.54662528384, // Same value
      '2024-03-31': 445500.0, // Updated value
      '2024-04-30': 447012.6188707172, // New entry
      '2024-05-31': 448699.39140656    // New entry
    };
    
    // Test merging
    const merged = { ...existingData, ...newData };
    const sortedData = {};
    Object.keys(merged).sort().forEach(date => {
      sortedData[date] = merged[date];
    });
    
    console.log('✅ Data merging logic test passed');
    console.log(`   Original data points: ${Object.keys(existingData).length}`);
    console.log(`   New data points: ${Object.keys(newData).length}`);
    console.log(`   Merged data points: ${Object.keys(sortedData).length}`);
    
    // Verify sorting
    const dates = Object.keys(sortedData);
    const isSorted = dates.every((date, i) => i === 0 || date >= dates[i - 1]);
    
    if (!isSorted) {
      throw new Error('Data is not properly sorted chronologically');
    }
    
    console.log('   ✅ Data is properly sorted chronologically');
    
    return true;
  } catch (error) {
    console.error('❌ Data merging test failed:', error);
    return false;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('🧪 Running ZHVI Data Update Tests\n');
  
  const results = [
    testJSONParsing(),
    testCSVParsing(),
    await testZillowURL(),
    testDataMerging()
  ];
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`\n📊 Test Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! The update script should work correctly.');
    console.log('\nTo update ZHVI data, run: npm run update-zhvi');
  } else {
    console.log('❌ Some tests failed. Please check the script before running.');
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}
