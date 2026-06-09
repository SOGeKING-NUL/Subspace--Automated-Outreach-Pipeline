import express from 'express';
import { searchDecisionMakers, bulkEnrichPeople } from '../services/prospeoService.js';

const router = express.Router();

router.post('/search', async (req, res) => {
  const { websites, page } = req.body;

  if (!websites || !Array.isArray(websites) || websites.length === 0) {
    return res.status(400).json({ error: 'Missing or invalid required field: websites (must be a non-empty array)' });
  }

  try {
    const rawData = await searchDecisionMakers(websites, page || 1);

    const results = (rawData.results || []).map(r => ({
      name: r.person?.full_name || `${r.person?.first_name || ''} ${r.person?.last_name || ''}`.trim(),
      designation: r.person?.current_job_title || null,
      company: r.company?.name || null,
      linkedin: r.person?.linkedin_url || null,
      person_id: r.person?.person_id || null
    }));

    return res.status(200).json({ 
      success: true, 
      results 
    });
    
  } catch (error) {
    const statusCode = error.response ? error.response.status : 500;
    const errorMessage = error.response && error.response.data 
      ? error.response.data 
      : { message: error.message };

    return res.status(statusCode).json({
      success: false,
      error: errorMessage
    });
  }
});

router.post('/enrich', async (req, res) => {
  const { people } = req.body;

  if (!people || !Array.isArray(people)) {
    return res.status(400).json({ error: 'Missing or invalid required field: people (must be an array)' });
  }

  try {
    const enrichedPeople = await bulkEnrichPeople(people);
    return res.status(200).json({ success: true, results: enrichedPeople });
  } catch (error) {
    const statusCode = error.response ? error.response.status : 500;
    const errorMessage = error.response && error.response.data 
      ? error.response.data 
      : { message: error.message };

    return res.status(statusCode).json({
      success: false,
      error: errorMessage
    });
  }
});

export default router;
