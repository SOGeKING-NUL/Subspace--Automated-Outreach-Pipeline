import express from 'express';
import { sendOutreachEmail, compileOutreachEmail } from '../services/brevoService.js';
import { promptUserInTerminal } from '../services/terminalReview.js';

const router = express.Router();

router.post('/send', async (req, res) => {
  const { people } = req.body;

  if (!people || !Array.isArray(people) || people.length === 0) {
    return res.status(400).json({ error: 'Missing or invalid required field: people (must be a non-empty array)' });
  }

  const results = [];
  let abortBatch = false;

  for (let i = 0; i < people.length; i++) {
    const person = people[i];

    if (abortBatch) {
      results.push({
        name: person.name || 'Unknown',
        email: person.email || null,
        status: 'skipped',
        error: 'Batch aborted by user.'
      });
      continue;
    }

    if (!person.email) {
      results.push({
        name: person.name || 'Unknown',
        email: null,
        status: 'skipped',
        error: 'No email address provided.'
      });
      continue;
    }
    const senderName = process.env.BREVO_SENDER_NAME || 'A Student';

    try {
      // Compile email content
      const { subject, htmlContent } = await compileOutreachEmail(person, senderName);

      // Prompt user in the terminal
      const action = await promptUserInTerminal(person, subject, htmlContent);

      if (action === 'q') {
        console.log('\n❌ Batch send aborted by user in terminal.');
        abortBatch = true;
        results.push({
          name: person.name,
          email: person.email,
          status: 'skipped',
          error: 'Batch aborted by user.'
        });
        continue;
      }

      if (action === 'k') {
        console.log(`\n⏭️ Skipped email for: ${person.name} (${person.email})`);
        results.push({
          name: person.name,
          email: person.email,
          status: 'skipped',
          error: 'Skipped by user in terminal.'
        });
        continue;
      }

      // Action is 's' (send)
      const response = await sendOutreachEmail(person, subject, htmlContent);
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
