#!/usr/bin/env node

/**
 * Zillow ZHVI Dataset Explorer
 * This script helps identify which ZHVI dataset you were using originally
 * and provides options to download the correct dataset
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Available ZHVI datasets from Zillow
const ZHVI_DATASETS = {
  // Standard ZHVI (35th-65th percentile, smoothed, seasonally adjusted)
  'standard_smoothed': {
    name: 'ZHVI - Standard (35th-65th percentile, smoothed, seasonally adjusted)',
    url: 'https://files.zillowstatic.com/research/public_csvs/zhvi/County_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv',
    description: 'Typical home value for middle-tier homes, smoothed and seasonally adjusted'
  },
  
  // Standard ZHVI (35th-65th percentile, raw)
  'standard_raw': {
    name: 'ZHVI - Standard (35th-65th percentile, raw)',
    url: 'https://files.zillowstatic.com/research/public_csvs/zhvi/County_zhvi_uc_sfrcondo_tier_0.33_0.67_month.csv',
    description: 'Typical home value for middle-tier homes, raw (not smoothed or seasonally adjusted)'
  },
  
  // All homes ZHVI (smoothed, seasonally adjusted)
  'all_homes_smoothed': {
    name: 'ZHVI - All Homes (smoothed, seasonally adjusted)',
    url: 'https://files.zillowstatic.com/research/public_csvs/zhvi/County_zhvi_uc_sfr_tier_0.0_1.0_sm_sa_month.csv',
    description: 'Typical home value for all single-family homes, smoothed and seasonally adjusted'
  },
  
  // All homes ZHVI (raw)
  'all_homes_raw': {
    name: 'ZHVI - All Homes (raw)',
    url: 'https://files.zillowstatic.com/research/public_csvs/zhvi/County_zhvi_uc_sfr_tier_0.0_1.0_month.csv',
    description: 'Typical home value for all single-family homes, raw'
  },
  
  // Top-tier ZHVI (65th-95th percentile, smoothed)
  'top_tier_smoothed': {
    name: 'ZHVI - Top Tier (65th-95th percentile, smoothed)',
    url: 'https://files.zillowstatic.com/research/public_csvs/zhvi/County_zhvi_uc_sfrcondo_tier_0.67_1.0_sm_sa_month.csv',
    description: 'Typical home value for higher-end homes, smoothed and seasonally adjusted'
  },
  
  // Bottom-tier ZHVI (5th-35th percentile, smoothed)
  'bottom_tier_smoothed': {
    name: 'ZHVI - Bottom Tier (5th-35th percentile, smoothed)',
    url: 'https://files.zillowstatic.com/research/public_csvs/zhvi/County_zhvi_uc_sfrcondo_tier_0.0_0.33_sm_sa_month.csv',
    description: 'Typical home value for lower-priced homes, smoothed and seasonally adjusted'
  }
};

/**
 * Read and parse current JSON data
 */
function getCurrentData() {
  const jsonPath = join(__dirname, 'avl-county-zhvi.json');
  
  if (!existsSync(jsonPath)) {
    throw new Error('avl-county-zhvi.json not found');
  }
  
  const content = readFileSync(jsonPath, 'utf8');
  const data = JSON.parse(content);
  
  // Handle array format
  const dataObject = Array.isArray(data) ? data[0] : data;
  
  return dataObject;
}

/**
 * Download and test a dataset to see if it matches current data
 */
async function testDataset(datasetKey, dataset) {
  console.log(`\n🔍 Testing: ${dataset.name}`);
  console.log(`   URL: ${dataset.url}`);
  
  try {
    // Download a small portion to test
    console.log('   Downloading sample...');
    const response = await fetch(dataset.url);
    
    if (!response.ok) {
      console.log(`   ❌ Failed to download (HTTP ${response.status})`);
      return null;
    }
    
    // Read first few lines to get headers and Buncombe data
    const text = await response.text();
    const lines = text.split('\n').slice(0, 50); // First 50 lines should include headers + some data
    
    if (lines.length < 2) {
      console.log('   ❌ Invalid CSV format');
      return null;
    }
    
    // Parse header
    const headers = lines[0].split(',');
    
    // Find Buncombe County row
    let buncombeRow = null;
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',');
      if (row[0] === '2156' || row[2] === 'Buncombe County') {
        buncombeRow = row;
        break;
      }
    }
    
    if (!buncombeRow) {
      console.log('   ❌ Buncombe County data not found');
      return null;
    }
    
    // Extract some recent data points for comparison
    const dataPoints = {};
    const dateColumns = headers.slice(9);
    const dataValues = buncombeRow.slice(9);
    
    // Get last few data points for comparison
    for (let i = Math.max(0, dateColumns.length - 10); i < dateColumns.length; i++) {
      const date = dateColumns[i];
      const value = dataValues[i];
      
      if (value && value.trim() !== '' && !isNaN(parseFloat(value))) {
        dataPoints[date] = parseFloat(value);
      }
    }
    
    console.log(`   ✅ Found ${Object.keys(dataPoints).length} recent data points`);
    
    return dataPoints;
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return null;
  }
}

/**
 * Compare dataset with current data
 */
function compareWithCurrent(testData, currentData) {
  if (!testData) return { matches: 0, total: 0, similarity: 0 };
  
  const testDates = Object.keys(testData);
  let matches = 0;
  let total = 0;
  
  for (const date of testDates) {
    if (date in currentData) {
      total++;
      const currentVal = currentData[date];
      const testVal = testData[date];
      
      // Check if values are very close (within 1%)
      const diff = Math.abs(currentVal - testVal);
      const percentDiff = diff / currentVal;
      
      if (percentDiff < 0.01) { // Within 1%
        matches++;
      }
    }
  }
  
  const similarity = total > 0 ? (matches / total) * 100 : 0;
  return { matches, total, similarity };
}

/**
 * Main function to explore datasets
 */
async function exploreDatasets() {
  console.log('🏠 Zillow ZHVI Dataset Explorer\n');
  
  try {
    // Read current data
    console.log('📊 Reading current data...');
    const currentData = getCurrentData();
    const currentDates = Object.keys(currentData).sort();
    
    console.log(`Found ${Object.keys(currentData).length} data points`);
    console.log(`Date range: ${currentDates[0]} to ${currentDates[currentDates.length - 1]}`);
    console.log(`Current value for 2025-01-31: $${currentData['2025-01-31']?.toLocaleString() || 'N/A'}`);
    
    console.log('\n🔍 Testing available ZHVI datasets...\n');
    
    const results = [];
    
    // Test each dataset
    for (const [key, dataset] of Object.entries(ZHVI_DATASETS)) {
      const testData = await testDataset(key, dataset);
      const comparison = compareWithCurrent(testData, currentData);
      
      results.push({
        key,
        dataset,
        testData,
        comparison
      });
      
      if (comparison.total > 0) {
        console.log(`   📈 Similarity: ${comparison.similarity.toFixed(1)}% (${comparison.matches}/${comparison.total} matches)`);
        
        if (testData && '2025-01-31' in testData) {
          const testValue = testData['2025-01-31'];
          const currentValue = currentData['2025-01-31'];
          const diff = Math.abs(testValue - currentValue);
          console.log(`   💰 2025-01-31 value: $${testValue.toLocaleString()} (diff: $${diff.toLocaleString()})`);
        }
      }
    }
    
    // Find best matches
    console.log('\n📊 Results Summary:\n');
    
    const sortedResults = results
      .filter(r => r.comparison.total > 0)
      .sort((a, b) => b.comparison.similarity - a.comparison.similarity);
    
    if (sortedResults.length === 0) {
      console.log('❌ No matching datasets found. This could indicate:');
      console.log('   • Zillow has changed their CSV structure');
      console.log('   • The original data came from a different source');
      console.log('   • Network issues prevented proper testing');
      return;
    }
    
    console.log('🏆 Best Matches:');
    for (let i = 0; i < Math.min(3, sortedResults.length); i++) {
      const result = sortedResults[i];
      console.log(`\n${i + 1}. ${result.dataset.name}`);
      console.log(`   Similarity: ${result.comparison.similarity.toFixed(1)}%`);
      console.log(`   Description: ${result.dataset.description}`);
      console.log(`   URL: ${result.dataset.url}`);
      
      if (result.testData && '2025-01-31' in result.testData) {
        console.log(`   2025-01-31 value: $${result.testData['2025-01-31'].toLocaleString()}`);
      }
    }
    
    // Recommendation
    const bestMatch = sortedResults[0];
    if (bestMatch.comparison.similarity > 95) {
      console.log(`\n✅ RECOMMENDATION: Use "${bestMatch.key}" dataset`);
      console.log('This appears to match your original data very closely.');
    } else if (bestMatch.comparison.similarity > 80) {
      console.log(`\n⚠️  RECOMMENDATION: "${bestMatch.key}" is the closest match but not perfect`);
      console.log('You may want to verify this is the correct dataset before updating.');
    } else {
      console.log('\n❓ No dataset provides a strong match to your original data.');
      console.log('Your original data may have come from:');
      console.log('• An older version of the dataset');
      console.log('• A different Zillow dataset not tested here');
      console.log('• Manual processing or calculations');
    }
    
    console.log('\n💡 Next Steps:');
    console.log('1. Review the best matching dataset above');
    console.log('2. Update the update-zhvi-data.js script to use the correct URL');
    console.log('3. Consider backing up your current data before updating');
    
  } catch (error) {
    console.error('❌ Error exploring datasets:', error);
    process.exit(1);
  }
}

// Run the explorer if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  exploreDatasets();
}

export { exploreDatasets, ZHVI_DATASETS };
