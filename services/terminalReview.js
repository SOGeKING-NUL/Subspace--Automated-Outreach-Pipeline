import readline from 'readline';

export function promptUserInTerminal(person, subject, htmlContent) {
  return new Promise(async (resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const ask = (q) => new Promise(res => rl.question(q, res));

    console.log('\n==================================================');
    console.log(`📧 EMAIL OUTREACH PREVIEW`);
    console.log(`Recipient : ${person.name || 'Unknown'} (${person.email})`);
    console.log(`Company   : ${person.company || 'Unknown'}`);
    console.log(`Designation: ${person.designation || 'Unknown'}`);
    console.log(`Subject   : ${subject}`);
    console.log('--------------------------------------------------');
    
    // Strip HTML tags for clean CLI presentation
    const textBody = htmlContent
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]*>/g, '')
      .trim();

    console.log(textBody);
    console.log('==================================================');

    let choice = '';
    while (true) {
      const answer = await ask('Action: [s]end / [k]eep/skip / [q]uit batch: ');
      choice = answer.trim().toLowerCase();
      if (['s', 'k', 'q'].includes(choice)) {
        break;
      }
      console.log('Invalid option. Please enter "s" to send, "k" to skip, or "q" to quit.');
    }

    rl.close();
    resolve(choice);
  });
}
