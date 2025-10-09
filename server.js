import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

const cache = {
  tickers: null,
  tickersExpiry: 0,
  companyData: new Map()
};

const CACHE_DURATION = 3600000; // 1 hour

// Rate limiting - but honestly i dont know if we are already surpassing it by the sheer amount of initial requests
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 170;

const rateLimitedFetch = async (url, options) => {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastRequestTime = Date.now();
  return fetch(url, options);
};

const fetchWithRetry = async (url, options, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await rateLimitedFetch(url, options);
      
      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('SEC API access forbidden. Please check your contact information.');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response;
    } catch (error) {
      console.error(`Attempt ${i + 1} failed:`, error.message);
      
      if (i === retries - 1) throw error;
      
      const waitTime = Math.min(1000 * Math.pow(2, i), 5000);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
};

// Middleware to validate user credentials
const validateCredentials = (req, res, next) => {
  const userAgent = req.headers['x-user-agent'];
  
  if (!userAgent || userAgent.length < 10) {
    return res.status(400).json({
      error: 'Contact information required',
      message: 'Please provide your organization and email to access SEC data.'
    });
  }
  
  // Basic email validation
  const emailPattern = /\S+@\S+\.\S+/;
  if (!emailPattern.test(userAgent)) {
    return res.status(400).json({
      error: 'Valid email required',
      message: 'SEC requires a valid email address in your contact information.'
    });
  }
  
  req.userAgent = userAgent;
  next();
};

app.get('/api/company-tickers', validateCredentials, async (req, res) => {
  try {
    // Check cache first
    if (cache.tickers && Date.now() < cache.tickersExpiry) {
      console.log('✓ Returning cached company tickers');
      return res.json(cache.tickers);
    }
    
    console.log(`Fetching company tickers for: ${req.userAgent}`);
    
    const response = await fetchWithRetry(
      'https://www.sec.gov/files/company_tickers.json',
      {
        headers: { 
          'User-Agent': req.userAgent,
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate, br'
        }
      }
    );
    
    const data = await response.json();
    
    cache.tickers = data;
    cache.tickersExpiry = Date.now() + CACHE_DURATION;
    
    console.log(`✓ Successfully fetched and cached ${Object.keys(data).length} company tickers`);
    res.json(data);
  } catch (error) {
    console.error('✗ Error fetching company tickers:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch company list from SEC',
      details: error.message
    });
  }
});

app.get('/api/company-facts/:cik', validateCredentials, async (req, res) => {
  try {
    const cik = req.params.cik;
    const cacheKey = `facts_${cik}`;
    
    // Check cache
    if (cache.companyData.has(cacheKey)) {
      const cached = cache.companyData.get(cacheKey);
      if (Date.now() < cached.expiry) {
        console.log(`✓ Returning cached data for CIK ${cik}`);
        return res.json(cached.data);
      }
    }
    
    console.log(`Fetching company facts for CIK ${cik} (user: ${req.userAgent})`);
    
    const response = await fetchWithRetry(
      `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`,
      { 
        headers: { 
          'User-Agent': req.userAgent,
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate, br'
        } 
      }
    );
    
    const data = await response.json();
    
    cache.companyData.set(cacheKey, {
      data,
      expiry: Date.now() + CACHE_DURATION
    });
    
    console.log(`✓ Successfully fetched and cached data for CIK ${cik}`);
    res.json(data);
  } catch (error) {
    console.error('✗ Error fetching company facts:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch company data from SEC',
      details: error.message
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    cache: {
      tickersCached: !!cache.tickers,
      tickersCount: cache.tickers ? Object.keys(cache.tickers).length : 0,
      companiesInCache: cache.companyData.size
    }
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║  SEC Financial Analyzer Server         ║
║  Running on http://localhost:${PORT}    ║
╚════════════════════════════════════════╝
  `);
});