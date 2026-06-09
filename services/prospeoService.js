import axios from 'axios';

async function postWithRetry(url, payload, config = {}, retries = 3, delayMs = 2000) {
  try {
    return await axios.post(url, payload, config);
  } catch (error) {
    if (retries > 0 && error.response && error.response.status === 429) {
      console.warn(`⚠️ Prospeo API rate limit (429) encountered for ${url}. Retrying in ${delayMs}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return postWithRetry(url, payload, config, retries - 1, delayMs * 1.5);
    }
    throw error;
  }
}

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
    const response = await postWithRetry(
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
    const response = await postWithRetry(
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

export async function bulkEnrichPeople(people) {
  const apiKey = process.env.PROSPEO_API;
  if (!apiKey) {
    throw new Error('PROSPEO_API key is not configured in .env file.');
  }

  const headers = {
    'Content-Type': 'application/json',
    'X-KEY': apiKey
  };

  const results = [];

  for (let i = 0; i < people.length; i++) {
    const person = people[i];
    
    const payload = {
      only_verified_email: false,
      enrich_mobile: false,
      data: {}
    };

    if (person.person_id) {
      payload.data.person_id = person.person_id;
    } else if (person.linkedin) {
      payload.data.linkedin_url = person.linkedin;
    } else {
      payload.data.full_name = person.name;
      if (person.company) {
        payload.data.company_name = person.company;
      }
    }

    try {
      console.log(`[${i+1}/${people.length}] Enriching ${person.name || person.linkedin}...`);
      const response = await postWithRetry(
        'https://api.prospeo.io/enrich-person',
        payload,
        { headers }
      );

      const email = response.data?.person?.email?.email || null;
      results.push({ ...person, email });

      // 1-second delay between requests to be extra safe on free tier rate limits
      if (i < people.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`Prospeo Enrich Person API Error for ${person.name || person.linkedin}:`, error.response?.data || error.message);
      results.push({ ...person, email: null });
    }
  }

  return results;
}

