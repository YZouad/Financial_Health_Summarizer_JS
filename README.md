# Financial Health Summarizer (SEC)

Small web app that looks up U.S. public companies by ticker, pulls **SEC EDGAR XBRL company facts**, and surfaces financial health–style metrics and charts in the browser.

## What’s included

- **Frontend**: Single-page UI (`index.html`) built with React (CDN), Tailwind (CDN), and Chart.js—served as static files by the server.
- **Backend**: Express proxy that calls SEC endpoints with required headers, **rate limiting**, retries, and **in-memory caching** (about one hour) for ticker JSON and per-CIK facts.
- **Compliance**: The SEC expects a descriptive `User-Agent` (organization + contact email). The UI collects org + email and sends them on each API request via the `X-User-Agent` header; the server forwards that as `User-Agent` to SEC.

## Requirements

- **Node.js** 18+ recommended (ES modules; `package.json` uses `"type": "module"`).

## Quick start

```bash
npm install
npm start
```

Open **http://localhost:3000**. Complete the credentials prompt (organization + email), then search by ticker.

The UI calls the API at **http://localhost:3000**; keep the default port **3000** or update both `server.js` (`PORT`) and the fetch URLs in `index.html` if you change it.

## API (local)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/health` | Server and cache status (no SEC contact header required). |
| `GET` | `/api/company-tickers` | SEC company ticker → CIK map. Header: `X-User-Agent: "<Org> email@domain"` |
| `GET` | `/api/company-facts/:cik` | XBRL facts for CIK (zero-padded). Same `X-User-Agent` header. |

## Optional: connectivity check

```bash
node test-connection.js
```

Rough probe of SEC URLs (uses a minimal `User-Agent`; not a substitute for the full app flow).

## Stack

Express, CORS, node-fetch; React / Tailwind / Chart.js loaded from CDNs in `index.html`.

## Disclaimer

This project is for **informational and educational use only**. SEC filings can be incomplete or lag reality; derived ratios and visuals are **not** investment, legal, or tax advice.

## Data source

Public data from the **U.S. Securities and Exchange Commission** ([sec.gov](https://www.sec.gov/)). Use responsibly and follow SEC [fair access](https://www.sec.gov/developer) guidance.
