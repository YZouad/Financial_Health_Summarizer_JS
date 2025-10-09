// Dont need this, just to verify all connections are valid/working


import fetch from 'node-fetch';

async function testConnection() {
  console.log('Testing connection to SEC...\n');
  
  const tests = [
    { name: 'DNS Resolution', url: 'https://www.sec.gov' },
    { name: 'Company Tickers', url: 'https://www.sec.gov/files/company_tickers.json' },
    { name: 'SEC Data API', url: 'https://data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json' }
  ];
  
  for (const test of tests) {
    try {
      console.log(`Testing: ${test.name}`);
      console.log(`URL: ${test.url}`);
      
      const response = await fetch(test.url, {
        headers: {
          'User-Agent': 'Test Script',
          'Accept': 'application/json'
        },
        timeout: 10000
      });
      
      console.log(`Status: ${response.status} ${response.statusText}`);
      console.log(`Success!\n`);
    } catch (error) {
      console.log(`Failed: ${error.message}\n`);
    }
  }
}

testConnection();