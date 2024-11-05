# Company Executive Scraper API

A robust web scraper API for detecting job postings on company websites. This service crawls websites to find career pages and job listings, using AI to extract structured job posting data.

## Features

- Automated job posting detection
- Intelligent career page recognition
- Robots.txt compliance
- Concurrent request handling
- Rate limiting
- AI-powered job data extraction
- RESTful API interface

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- OpenAI API key

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```
OPENAI_API_KEY=your_api_key_here
PORT=3000
```

## Starting the API Server

Development mode with auto-reload:
```bash
npm run dev:api
```

Production mode:
```bash
npm run build
npm run start:api
```

## API Endpoints

### Health Check
```
GET /health
```
Returns server status.

### Scrape Website
```
POST /scrape
Content-Type: application/json

{
    "url": "https://example.com"
}
```

Example response:
```json
{
    "website": "https://example.com",
    "hasJobs": true,
    "jobPostings": [
        {
            "title": "Software Engineer",
            "location": "San Francisco, CA",
            "department": "Engineering",
            "description": "...",
            "url": "https://example.com/jobs/software-engineer"
        }
    ]
}
```

## Usage Example

Using curl:
```bash
curl -X POST http://localhost:3000/scrape \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.example.com"}'
```

Using Node.js:
```javascript
const response = await fetch('http://localhost:3000/scrape', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    url: 'https://www.example.com'
  })
});

const data = await response.json();
```

## Configuration

The scraper can be configured through environment variables and constants. Key configurations can be found in:


```4:37:src/config/constants.ts
  'join-us',
  'join us',
  'work with us',
  'positions',
  'vacancies',
  'opportunities', 
  'open positions',
];

export const JOB_RELATED_KEYWORDS = [
  'apply now',
  'job description',
  'requirements',
  'qualifications',
  'position',
  'role',
  'employment'
];

export const DEFAULT_TIMEOUT = 10000; // 10 seconds
export const MAX_CONCURRENT_REQUESTS = 3;
export const MAX_DEPTH = 2;

export const USER_AGENT = 'Mozilla/5.0 (compatible; JobScraperBot/1.0; +http://example.com/bot)';

export const COMMON_JOB_TITLES = [
  'engineer', 'developer', 'manager', 'director', 'analyst', 'designer',
  'coordinator', 'specialist', 'consultant', 'administrator', 'architect',
  'scientist', 'researcher', 'technician', 'lead', 'head of', 'vp', 'chief',
  'officer', 'associate', 'assistant', 'intern'
];

export const EMPLOYMENT_TYPES = [
  'full-time', 'part-time', 'contract', 'temporary', 'internship',
```


## Response Types

The API returns job posting data in a structured format as defined in:


```1:15:src/types/index.ts
export interface JobPosting {
  title: string;
  url: string;
  location?: string;
  description?: string;
  company?: string;
  department?: string;
  employmentType?: string;
  salary?: string;
  experienceLevel?: string;
  postedDate?: string;
  skills?: string[];
  benefits?: string[];
  isRemote?: boolean;
}
```


## Error Handling

The API returns appropriate HTTP status codes:
- 200: Successful scrape
- 400: Invalid URL
- 500: Server error

Error responses include an error message in the response body:
```json
{
    "error": "Error message here"
}
```

## Rate Limiting

The scraper implements rate limiting to respect website servers:
- Minimum 1 second between requests to the same domain
- Maximum 3 concurrent requests

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

MIT