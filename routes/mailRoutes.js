import express from 'express';
import { sendOutreachEmail } from '../services/brevoService.js';

const router = express.Router();

router.post('/send', async (req, res) => {
  const { people } = req.body;

  if (!people || !Array.isArray(people) || people.length === 0) {
    return res.status(400).json({ error: 'Missing or invalid required field: people (must be a non-empty array)' });
  }

  const results = [];

  for (const person of people) {
    if (!person.email) {
      results.push({
        name: person.name || 'Unknown',
        email: null,
        status: 'skipped',
        error: 'No email address provided.'
      });
      continue;
    }

    try {
      const response = await sendOutreachEmail(person);
      results.push({
        name: person.name,
        email: person.email,
        status: 'sent',
        messageId: response.messageId
      });
    } catch (error) {
      const errorMessage = error.response && error.response.data 
        ? error.response.data 
        : error.message;
      
      results.push({
        name: person.name,
        email: person.email,
        status: 'failed',
        error: errorMessage
      });
    }
  }

  const successCount = results.filter(r => r.status === 'sent').length;
  const failureCount = results.filter(r => r.status === 'failed').length;
  const skippedCount = results.filter(r => r.status === 'skipped').length;

  return res.status(200).json({
    success: true,
    summary: {
      total: people.length,
      sent: successCount,
      failed: failureCount,
      skipped: skippedCount
    },
    details: results
  });
});

export default router;
