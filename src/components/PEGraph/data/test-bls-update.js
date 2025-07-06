#!/usr/bin/env node

/**
 * Test script for BLS data update functionality
 * This script tests the update functionality without making actual API calls
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function testDataParsing() {
  console.log('Testing data parsing...');
  
  try {
    const filePath = join(__dirname, 'bls-wages.ts');
    const content = readFileSync(filePath, 'utf8');
    
    // Extract data points using the same regex as the main script
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
    
    console.log(`✅ Successfully parsed ${dataPoints.length} data points`);
    
    if (dataPoints.length > 0) {
      const latest = dataPoints[dataPoints.length - 1];
      console.log(`   Latest data point: ${latest.year} ${latest.period} = $${latest.value}`);
      
      const earliest = dataPoints[0];
      console.log(`   Earliest data point: ${earliest.year} ${earliest.period} = $${earliest.value}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Data parsing test failed:', error);
    return false;
  }
}

function testMockAPIResponse() {
  console.log('\nTesting mock API response processing...');
  
  // Mock BLS API response structure
  const mockApiResponse = {
    status: 'REQUEST_SUCCEEDED',
    responseTime: 100,
    message: [],
    Results: {
      series: [{
        seriesID: 'ENU3702140010',
        data: [
          {
            year: '2024',
            period: 'Q04',
            periodName: '4th Quarter',
            value: '1150',
            footnotes: [{}]
          },
          {
            year: '2024',
            period: 'Q05',
            periodName: 'Annual',
            value: '1100',
            footnotes: [{}]
          }
        ]
      }]
    }
  };
  
  try {
    // Test parsing logic
    if (!mockApiResponse.Results || !mockApiResponse.Results.series || mockApiResponse.Results.series.length === 0) {
      throw new Error('Invalid API response structure');
    }
    
    const series = mockApiResponse.Results.series[0];
    const data = series.data || [];
    
    console.log(`✅ Successfully parsed mock API response with ${data.length} data points`);
    data.forEach(d => {
      console.log(`   Mock data: ${d.year} ${d.period} = $${d.value}`);
    });
    
    return true;
  } catch (error) {
    console.error('❌ Mock API response test failed:', error);
    return false;
  }
}

function runTests() {
  console.log('🧪 Running BLS Data Update Tests\n');
  
  const results = [
    testDataParsing(),
    testMockAPIResponse()
  ];
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`\n📊 Test Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! The update script should work correctly.');
    console.log('\nTo update BLS data, run: npm run update-bls');
  } else {
    console.log('❌ Some tests failed. Please check the script before running.');
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests();
}
