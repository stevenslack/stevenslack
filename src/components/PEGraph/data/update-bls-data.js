#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// BLS API configuration
const BLS_API_URL = 'https://api.bls.gov/publicAPI/v2/timeseries/data/ENU3702140010/';
const SERIES_ID = 'ENU3702140010';

/**
 * Fetch data from BLS API
 * @param {string} startYear - Optional start year
 * @param {string} endYear - Optional end year
 * @returns {Promise<Object>} API response data
 */
async function fetchBLSData(startYear = null, endYear = null) {
  let url = `${BLS_API_URL}?calculations=true&annualaverage=true&aspects=true`;
  
  if (startYear && endYear) {
    url += `&startyear=${startYear}&endyear=${endYear}`;
  }
  
  console.log(`Fetching data from: ${url}`);
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching BLS data:', error);
    throw error;
  }
}

/**
 * Parse BLS API response and extract data points
 * @param {Object} apiResponse - BLS API response
 * @returns {Array} Array of data points
 */
function parseBLSResponse(apiResponse) {
  if (!apiResponse.Results || !apiResponse.Results.series || apiResponse.Results.series.length === 0) {
    throw new Error('Invalid API response structure');
  }
  
  const series = apiResponse.Results.series[0];
  if (series.seriesID !== SERIES_ID) {
    console.warn(`Warning: Expected series ID ${SERIES_ID}, got ${series.seriesID}`);
  }
  
  return series.data || [];
}

/**
 * Read the current bls-wages.ts file and extract existing data
 * @returns {Array} Array of existing data points
 */
function readExistingData() {
  const filePath = join(__dirname, 'bls-wages.ts');
  
  try {
    const content = readFileSync(filePath, 'utf8');
    
    // Extract data points using regex
    const dataMatch = content.match(/const seriesData: SeriesDataPoint\[\] = \[([\s\S]*?)\];/);
    if (!dataMatch) {
      throw new Error('Could not find seriesData array in bls-wages.ts');
    }
    
    const dataString = dataMatch[1];
    const dataPoints = [];
    
    // Parse individual data points
    const pointRegex = /\{\s*year:\s*'(\d+)',\s*period:\s*'(Q\d+)',\s*value:\s*'(\d+)'\s*\}/g;
    let match;
    
    while ((match = pointRegex.exec(dataString)) !== null) {
      dataPoints.push({
        year: match[1],
        period: match[2],
        value: match[3]
      });
    }
    
    return dataPoints;
  } catch (error) {
    console.error('Error reading existing data:', error);
    throw error;
  }
}

/**
 * Convert BLS API data point to our format
 * @param {Object} blsDataPoint - BLS API data point
 * @returns {Object} Formatted data point
 */
function convertBLSDataPoint(blsDataPoint) {
  return {
    year: blsDataPoint.year,
    period: blsDataPoint.period,
    value: blsDataPoint.value
  };
}

/**
 * Merge new data with existing data, avoiding duplicates
 * @param {Array} existingData - Current data points
 * @param {Array} newData - New data points from API
 * @returns {Array} Merged and sorted data
 */
function mergeData(existingData, newData) {
  const existing = new Set(existingData.map(d => `${d.year}-${d.period}`));
  const converted = newData.map(convertBLSDataPoint);
  
  // Filter out duplicates
  const newUniqueData = converted.filter(d => !existing.has(`${d.year}-${d.period}`));
  
  console.log(`Found ${newUniqueData.length} new data points to add`);
  
  if (newUniqueData.length > 0) {
    newUniqueData.forEach(d => {
      console.log(`  Adding: ${d.year} ${d.period} = $${d.value}`);
    });
  }
  
  // Combine and sort by year and period
  const allData = [...existingData, ...newUniqueData];
  
  return allData.sort((a, b) => {
    const yearDiff = parseInt(a.year) - parseInt(b.year);
    if (yearDiff !== 0) return yearDiff;
    
    // Sort by period (Q01, Q02, Q03, Q04, Q05)
    const periodOrder = { 'Q01': 1, 'Q02': 2, 'Q03': 3, 'Q04': 4, 'Q05': 5 };
    return periodOrder[a.period] - periodOrder[b.period];
  });
}

/**
 * Write updated data back to bls-wages.ts file
 * @param {Array} data - Complete data array
 */
function writeUpdatedData(data) {
  const filePath = join(__dirname, 'bls-wages.ts');
  
  const content = `interface SeriesDataPoint {
  year: string;
  period: string;
  value: string;
}

const seriesData: SeriesDataPoint[] = [
${data.map(d => `  { year: '${d.year}', period: '${d.period}', value: '${d.value}' },`).join('\n')}
];

export default seriesData;
`;
  
  try {
    writeFileSync(filePath, content, 'utf8');
    console.log(`Successfully updated ${filePath} with ${data.length} total data points`);
  } catch (error) {
    console.error('Error writing updated data:', error);
    throw error;
  }
}

/**
 * Get the latest year from existing data to determine what new data to fetch
 * @param {Array} existingData - Current data points
 * @returns {string} Latest year in the data
 */
function getLatestYear(existingData) {
  if (existingData.length === 0) return '2020'; // Default fallback
  
  const years = existingData.map(d => parseInt(d.year));
  return Math.max(...years).toString();
}

/**
 * Main function to update BLS data
 */
async function updateBLSData() {
  console.log('Starting BLS data update...');
  
  try {
    // Read existing data
    console.log('Reading existing data...');
    const existingData = readExistingData();
    console.log(`Found ${existingData.length} existing data points`);
    
    if (existingData.length > 0) {
      const latest = existingData[existingData.length - 1];
      console.log(`Latest data point: ${latest.year} ${latest.period} = $${latest.value}`);
    }
    
    // Determine the year range to fetch
    const latestYear = getLatestYear(existingData);
    const currentYear = new Date().getFullYear().toString();
    
    console.log(`Fetching data from ${latestYear} to ${currentYear}...`);
    
    // Fetch new data from BLS API
    const apiResponse = await fetchBLSData(latestYear, currentYear);
    
    if (!apiResponse.status === 'REQUEST_SUCCEEDED') {
      console.warn('API request may not have succeeded fully:', apiResponse.message);
    }
    
    const newData = parseBLSResponse(apiResponse);
    console.log(`Retrieved ${newData.length} data points from API`);
    
    // Merge and sort data
    const mergedData = mergeData(existingData, newData);
    
    // Write updated data
    writeUpdatedData(mergedData);
    
    console.log('BLS data update completed successfully!');
    
  } catch (error) {
    console.error('Failed to update BLS data:', error);
    process.exit(1);
  }
}

// Run the update if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  updateBLSData();
}

export { updateBLSData };
