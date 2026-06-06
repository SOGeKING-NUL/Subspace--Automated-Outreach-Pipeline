import express from 'express';
import { searchLookalikeCompanies } from '../services/oceanService.js';
import { searchDecisionMakers } from '../services/prospeoService.js';

const router = express.Router();

router.post('/search', async (req, res) => {
  const { domain, limit } = req.body;

  if (!domain) {
    return res.status(400).json({ error: 'Missing required field: domain' });
  }

  try {
    const data = await searchLookalikeCompanies(domain, limit);
    return res.status(200).json({ success: true, data });
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

router.post('/decision-makers', async (req, res) => {
  const { websites, page } = req.body;

  if (!websites || !Array.isArray(websites) || websites.length === 0) {
    return res.status(400).json({ error: 'Missing or invalid required field: websites (must be a non-empty array)' });
  }

  try {
    const data = await searchDecisionMakers(websites, page || 1);
    return res.status(200).json({ success: true, data });
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
