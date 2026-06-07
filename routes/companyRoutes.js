import express from 'express';
import { searchLookalikeCompanies } from '../services/oceanService.js';

const router = express.Router();

router.post('/search', async (req, res) => {
  const { domain, limit } = req.body;

  if (!domain) {
    return res.status(400).json({ error: 'Missing required field: domain' });
  }

  try {
    const rawData = await searchLookalikeCompanies(domain, limit);
    
    const domains = (rawData.companies || []).map(c => c.company?.domain).filter(Boolean);
    return res.status(200).json({ success: true, domains });

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
