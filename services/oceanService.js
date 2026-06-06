import axios from 'axios';

export async function searchLookalikeCompanies(seedDomain, limit = 10) {

  const apiKey = process.env.OCEAN_API;
  if (!apiKey) {
    throw new Error('OCEAN_API key is not configured in .env file.');
  }

  const headers = {
    'Content-Type': 'application/json',
    'X-Api-Token': apiKey
  };

  const payload = {
    companiesFilters: {
      lookalikeDomains: [seedDomain],
      primaryLocations: { includeCountries: ['in'] },
    },
    size: limit
  };

  try {
    console.log(`Sending lookalike search request to Ocean.io for seed domain: ${seedDomain}`);
    
    const response = await axios.post(
      'https://api.ocean.io/v3/search/companies',
      payload,
      { headers }
    );
    return response.data;

  } catch (error) {
    console.error('Ocean.io API Error:', error);
    throw error;
  }
}