import axios from 'axios';

export async function compileOutreachEmail(person, senderName = 'Utsav Jana') {
  const apiKey = process.env.OPENROUTER_API;
  if (!apiKey) {
    throw new Error('OpenRouter API key (OPENROUTER_API) is not configured in .env file.');
  }

  const resumeLink = process.env.RESUME_DRIVE_LINK || '';

  const prompt = `
    Write a highly personalized, professional cold outreach email to ${person.name || 'a company leader'}.
    Their designation is ${person.designation || 'Leader'}, and they work at ${person.company || 'their company'}.
    ${person.linkedin ? `Their LinkedIn profile URL is ${person.linkedin}` : ''}
    
    You are writing on behalf of ${senderName}, a proactive 3rd-year B.Tech student looking to land a job or internship at their company.
    
    INSTRUCTIONS FOR PERSONALIZATION:
    1. IMPORTANT: First, perform a thorough web search on their company (${person.company || 'the company'}) to discover exactly what they do, their recent news, or their core products.
    2. Deeply consider their specific context as a ${person.designation || 'Leader'}.
    3. Write a highly tailored message demonstrating that you have researched their company and understand their current focus.
    4. Clearly explain how your enthusiasm, technical background as a B.Tech student, and fresh perspective could provide value to their team.
    ${resumeLink ? `5. You must naturally include a link to the student's resume in the email body. The resume link is: ${resumeLink}` : ''}
    
    The email must have exactly two parts separated by a unique delimiter '|||':
    Part 1: The email subject line. Make it catchy, highly personalized, and relevant to their company.
    Part 2: The HTML body of the email.
    
    Do NOT include any markdown code blocks (like \`\`\`html) in your response. Output the plain subject, then '|||', then the raw HTML body. 
    The HTML body should be clean, polite, professional, and explicitly invite them for a brief introductory chat to discuss potential opportunities. Include a professional signature with the student's name${resumeLink ? ' and a link to their resume' : ''}.
  `;

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'google/gemini-2.5-pro',
        messages: [{ role: 'user', content: prompt }],
        plugins: [{ id: 'web' }]
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'Automated Outreach Pipeline',
          'Content-Type': 'application/json'
        }
      }
    );

    const responseText = response.data.choices[0].message.content;
    
    const parts = responseText.split('|||');
    if (parts.length >= 2) {
      const subject = parts[0].trim().replace(/^Subject:\s*/i, '');
      const htmlContent = parts.slice(1).join('|||').trim();
      return { subject, htmlContent };
    } else {
      throw new Error('LLM response format was unexpected. Expected two parts separated by "|||".');
    }
  } catch (error) {
    const errorDetails = error.response ? JSON.stringify(error.response.data) : error.message;
    console.error('OpenRouter Email Generation Error:', errorDetails);
    throw new Error(`Failed to generate email via OpenRouter: ${errorDetails}`);
  }
}

export async function sendOutreachEmail(person, precompiledSubject = null, precompiledHtml = null) {
  const apiKey = process.env.BREVO_API_KEY || process.env.BREVO_API;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || 'Utsav Jana';

  if (!apiKey) {
    throw new Error('Brevo API key (BREVO_API_KEY) is not configured in .env file.');
  }

  if (!person.email) {
    throw new Error(`Cannot send email to ${person.name || 'contact'} because email is missing.`);
  }

  // Use precompiled subject and body, or generate them
  const { subject, htmlContent } = (precompiledSubject && precompiledHtml) 
    ? { subject: precompiledSubject, htmlContent: precompiledHtml }
    : await compileOutreachEmail(person, senderName);

  const payload = {
    sender: {
      name: senderName,
      email: senderEmail
    },
    to: [
      {
        email: person.email,
        name: person.name || ''
      }
    ],
    subject,
    htmlContent
  };

  try {
    console.log(`Sending transactional email via Brevo to: ${person.email} (${person.name || ''})`);
    const response = await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      payload,
      {
        headers: {
          'accept': 'application/json',
          'api-key': apiKey,
          'content-type': 'application/json'
        }
      }
    );
    return { success: true, messageId: response.data?.messageId };
  } catch (error) {
    console.error(`Brevo Email Send Error for ${person.email}:`, error.response?.data || error.message);
    throw error;
  }
}
