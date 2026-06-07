import axios from 'axios';

export function compileOutreachEmail(person, senderName = 'Subspace Team') {
  const subject = `Collaborating with ${person.company || 'your team'} on subscription orchestration`;
  
  const htmlContent = `
    <html>
      <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
        <p>Hi ${person.name || 'there'},</p>
        
        <p>I hope you're having a great week.</p>
        
        <p>I recently came across your profile and noticed your work as <strong>${person.designation || 'Leader'}</strong> at <strong>${person.company || 'your company'}</strong>. Given your role in driving technology and operations, I thought you might find what we're building at Subspace interesting.</p>
        
        <p>At <strong>Subspace</strong>, we help scaling companies automate their subscription and monthly recurring expense tracking with just a single click. We enable teams to manage shared billing, gain real-time visibility into software overheads, and streamline dynamic vendor payments.</p>
        
        <p>Since your team is active in this space, do you have 5 minutes next Tuesday for a quick introductory chat to see if we can help optimize your team's operational expenditures?</p>
        
        <p>Best regards,</p>
        <p><strong>${senderName}</strong><br/>
        Subspace Team<br/>
        <a href="https://subspace.money" style="color: #FF1A26; text-decoration: none;">subspace.money</a></p>
      </body>
    </html>
  `;

  return { subject, htmlContent };
}

export async function sendOutreachEmail(person, precompiledSubject = null, precompiledHtml = null) {
  const apiKey = process.env.BREVO_API_KEY || process.env.BREVO_API;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'outreach@subspace.money';
  const senderName = process.env.BREVO_SENDER_NAME || 'Subspace Team';

  if (!apiKey) {
    throw new Error('Brevo API key (BREVO_API_KEY) is not configured in .env file.');
  }

  if (!person.email) {
    throw new Error(`Cannot send email to ${person.name || 'contact'} because email is missing.`);
  }

  // Use precompiled subject and body, or generate them
  const { subject, htmlContent } = (precompiledSubject && precompiledHtml) 
    ? { subject: precompiledSubject, htmlContent: precompiledHtml }
    : compileOutreachEmail(person, senderName);

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
