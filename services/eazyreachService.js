import axios from 'axios';

let cachedToken = null;
let tokenExpiry = null; // Token is typically good for some time, we can fetch per session or simple caching.

async function getAuthToken() {
  // If we have a cached token, return it
  if (cachedToken) {
    return cachedToken;
  }

  const clientId = process.env.EAZYREACH_CLIENT_ID;
  const clientSecret = process.env.EAZYREACH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('EAZYREACH_CLIENT_ID and EAZYREACH_CLIENT_SECRET must be configured in .env file.');
  }

  try {
    console.log('Fetching Eazyreach authentication token...');
    const response = await axios.post('https://api.superflow.run/b2b/createAuthToken/', {
      clientId,
      clientSecret
    });

    if (response.data && response.data.status === 'success' && response.data.auth_token) {
      cachedToken = response.data.auth_token;
      return cachedToken;
    } else {
      throw new Error(response.data?.message || 'Failed to retrieve auth token from Eazyreach.');
    }
  } catch (error) {
    console.error('Eazyreach Authentication Error:', error.response?.data || error.message);
    throw error;
  }
}

export async function getLinkedInEmail(linkedinUrl) {
  try {
    const token = await getAuthToken();
    const cleanUrl = linkedinUrl.replace(/^(https?:\/\/)?(www\.)?/, ''); // Clean protocol/www if present
    
    console.log(`Resolving emails from Eazyreach for LinkedIn URL: ${cleanUrl}`);
    const response = await axios.post(
      'https://api.superflow.run/b2b/linkedin-emails',
      { linkedinUrl: cleanUrl },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (response.data && response.data.status === 'success') {
      return response.data.emails || [];
    }
    return [];
  } catch (error) {
    // If it's a 404 (profile not found), log and return empty array instead of crashing
    if (error.response?.status === 404) {
      console.warn(`LinkedIn profile not found in Eazyreach: ${linkedinUrl}`);
      return [];
    }
    console.error(`Eazyreach LinkedIn email resolution error for ${linkedinUrl}:`, error.response?.data || error.message);
    throw error;
  }
}

export async function enrichPeopleWithEmails(people) {
  const enrichedResults = [];

  for (const person of people) {
    // Clone person object
    const enrichedPerson = { ...person };
    
    // Always initialize/ensure email property exists
    enrichedPerson.email = null;

    if (enrichedPerson.linkedin) {
      try {
        const emails = await getLinkedInEmail(enrichedPerson.linkedin);
        // Find the first verified or probable email
        const matchedEmail = emails.find(e => e.verification === 'verified') || emails[0];
        if (matchedEmail) {
          enrichedPerson.email = matchedEmail.email;
        }
      } catch (err) {
        console.error(`Skipping email enrichment for ${enrichedPerson.name} due to error.`, err);
      }
    }
    
    enrichedResults.push(enrichedPerson);
  }

  return enrichedResults;
}
