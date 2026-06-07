import axios from 'axios';

export async function searchDecisionMakers(websites, page = 1) {
  const apiKey = process.env.PROSPEO_API;
  if (!apiKey) {
    throw new Error('PROSPEO_API key is not configured in .env file.');
  }

  const headers = {
    'Content-Type': 'application/json',
    'X-KEY': apiKey
  };

  const payload = {
    page,
    filters: {
      company: {
        websites: {
          include: websites
        }
      },
      person_seniority: {
        include: ['C-Suite', 'Vice President', 'Founder/Owner']
      }
    }
  };

  try {
    console.log(`Sending search-person request to Prospeo for websites: ${JSON.stringify(websites)}`);
    const response = await axios.post(
      'https://api.prospeo.io/search-person',
      payload,
      { headers }
    );
    return response.data;
  } catch (error) {
    console.error('Prospeo API Error:', error);
    throw error;
  }
}

export async function enrichPersonByLinkedin(linkedinUrl) {
  const apiKey = process.env.PROSPEO_API;
  if (!apiKey) {
    throw new Error('PROSPEO_API key is not configured in .env file.');
  }

  const headers = {
    'Content-Type': 'application/json',
    'X-KEY': apiKey
  };

  const payload = {
    data: {
      linkedin_url: linkedinUrl
    }
  };

  try {
    console.log(`Sending enrich-person request to Prospeo for LinkedIn URL: ${linkedinUrl}`);
    const response = await axios.post(
      'https://api.prospeo.io/enrich-person',
      payload,
      { headers }
    );
    return response.data;
  } catch (error) {
    console.error('Prospeo Enrich Person API Error:', error.response?.data || error.message);
    throw error;
  }
}
