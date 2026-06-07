import express from 'express';
import { searchLookalikeCompanies } from '../services/oceanService.js';
import { searchDecisionMakers } from '../services/prospeoService.js';
import { enrichPeopleWithEmails } from '../services/eazyreachService.js';
import { sendOutreachEmail, compileOutreachEmail } from '../services/brevoService.js';
import { promptUserInTerminal } from '../services/terminalReview.js';

const router = express.Router();

router.post('/run', async (req, res) => {
  const { domain, limit } = req.body;

  if (!domain) {
    return res.status(400).json({ error: 'Missing required field: domain' });
  }

  try {
    console.log(`\n🚀 Starting Automated Outreach Pipeline for seed domain: ${domain}`);

    // --- STAGE 1: Lookalike Company Search (Ocean.io) ---
    console.log('--- STAGE 1: Finding lookalike companies ---');
    const rawCompanies = await searchLookalikeCompanies(domain, limit || 10);
    const domains = (rawCompanies.companies || []).map(c => c.company?.domain).filter(Boolean);

    if (domains.length === 0) {
      console.log('⚠️ No lookalike domains found. Pipeline finished.');
      return res.status(200).json({
        success: true,
        message: 'No lookalike domains found.',
        summary: { total: 0, sent: 0, failed: 0, skipped: 0 }
      });
    }
    console.log(`Found ${domains.length} lookalike domains: ${domains.join(', ')}`);

    // --- STAGE 2: Person Search (Prospeo) ---
    console.log('--- STAGE 2: Searching for decision-makers ---');
    // Using a default of page 1. Prospeo might return a NO_RESULTS error if no one matches
    let rawPeople;
    try {
      rawPeople = await searchDecisionMakers(domains, 1);
    } catch (err) {
      if (err.response?.data?.error_code === 'NO_RESULTS') {
        console.log('⚠️ No decision-makers found for these domains.');
        return res.status(200).json({
          success: true,
          message: 'No decision-makers found.',
          summary: { total: 0, sent: 0, failed: 0, skipped: 0 }
        });
      }
      throw err;
    }

    const people = (rawPeople.results || []).map(r => ({
      name: r.person?.full_name || `${r.person?.first_name || ''} ${r.person?.last_name || ''}`.trim(),
      designation: r.person?.current_job_title || null,
      company: r.company?.name || null,
      linkedin: r.person?.linkedin_url || null
    }));

    if (people.length === 0) {
      console.log('⚠️ No decision-makers found.');
      return res.status(200).json({
        success: true,
        message: 'No decision-makers found.',
        summary: { total: 0, sent: 0, failed: 0, skipped: 0 }
      });
    }
    console.log(`Found ${people.length} decision-makers.`);

    // --- STAGE 3: Email Resolution (EazyReach) ---
    console.log('--- STAGE 3: Enriching profiles with work emails ---');
    const enrichedPeople = await enrichPeopleWithEmails(people);

    // --- STAGE 4: Interactive Review & Sending (Brevo) ---
    console.log('--- STAGE 4: Launching interactive email review ---');
    const results = [];
    let abortBatch = false;

    for (const person of enrichedPeople) {
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
          error: 'No email address resolved.'
        });
        continue;
      }

      const senderName = process.env.BREVO_SENDER_NAME || 'Subspace Team';
      const { subject, htmlContent } = compileOutreachEmail(person, senderName);

      try {
        const action = await promptUserInTerminal(person, subject, htmlContent);

        if (action === 'q') {
          console.log('\n❌ Pipeline execution aborted by user in terminal.');
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

    console.log(`\n🎉 Pipeline completed. Sent: ${successCount}, Failed: ${failureCount}, Skipped: ${skippedCount}`);

    return res.status(200).json({
      success: true,
      summary: {
        total: enrichedPeople.length,
        sent: successCount,
        failed: failureCount,
        skipped: skippedCount
      },
      details: results
    });

  } catch (error) {
    console.error('Pipeline Execution Error:', error);
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
