# 📧 Automated Cold Outreach Pipeline

An end-to-end automated pipeline that discovers companies similar to a target domain, finds their decision-makers, generates hyper-personalized cold emails using AI with live web research, and sends them — all from a single terminal command.

## System Design

<!-- Replace with your system design flowchart image -->
![System Design](./assets/system-design.png)

## How It Works

The pipeline runs through **4 stages** sequentially:

| Stage | What It Does | API Used |
|-------|-------------|----------|
| **1. Company Discovery** | Finds lookalike companies from a seed domain | Ocean.io |
| **2. People Search** | Discovers C-Suite, VPs, and Founders at those companies | Prospeo |
| **3. Email Enrichment** | Resolves verified work email addresses for each person | Prospeo |
| **4. AI Email Generation** | Generates a personalized cold email using web search context, then prompts you to send/skip/quit | OpenRouter (Gemini 2.5 Pro + Web Search) → Brevo |

## Email Preview

<!-- Replace with a screenshot of the email preview in terminal or the sent email -->
![Email Preview](./assets/email-preview.png)

## Setup

### 1. Clone & Install

```bash
git clone https://github.com/SOGeKING-NUL/Subspace--Automated-Outreach-Pipeline.git
cd Subspace--Automated-Outreach-Pipeline
npm install
```

### 2. Configure Environment

Create a `.env` file in the project root:

```env
PORT=3000

PROSPEO_API=your_prospeo_api_key
OCEAN_API=your_ocean_api_key
BREVO_API=your_brevo_api_key

BREVO_SENDER_EMAIL=your_verified_email@gmail.com
BREVO_SENDER_NAME=Your Name
RESUME_DRIVE_LINK=https://drive.google.com/your-resume-link

OPENROUTER_API=your_openrouter_api_key
```

### 3. Verify Brevo Sender

Log into your [Brevo Dashboard](https://app.brevo.com/) and verify `BREVO_SENDER_EMAIL` as a sender so transactional emails can be dispatched from your address.

## Usage

### CLI Mode (Recommended)

Run the full pipeline with a single command:

```bash
node server.js docker.com
```

With a custom company limit:

```bash
node server.js docker.com 5
```

Or via npm:

```bash
npm run pipeline -- docker.com
```

### Server Mode

Start the Express API (for programmatic/REST access):

```bash
npm run dev
```

Then trigger the pipeline via HTTP:

```bash
curl -X POST http://localhost:3000/api/pipeline/run \
  -H "Content-Type: application/json" \
  -d '{"domain": "docker.com", "limit": 5}'
```

## Terminal Logs

```bash
$ node server.js pandadoc.com

🚀 Starting Automated Outreach Pipeline for seed domain: pandadoc.com
--- STAGE 1: Finding lookalike companies ---
Sending lookalike search request to Ocean.io for seed domain: pandadoc.com
Found 5 lookalike domains: ospyn.com, docuvity.com, crove.app, xfilespro.com, cloudfiles.io
--- STAGE 2: Searching for decision-makers ---
Sending search-person request to Prospeo for websites: ["ospyn.com","docuvity.com","crove.app","xfilespro.com","cloudfiles.io"]
Found 23 decision-makers.
--- STAGE 3: Enriching profiles with work emails ---
Limiting enrichment to 5 people for testing/credit savings.
Enriching 5 people sequentially using individual enrich endpoint...
[1/5] Enriching Rakesh Rao...
[2/5] Enriching Prasadu Varghese...
[3/5] Enriching Kishore Kumar...
[4/5] Enriching Vishesh Singhal...
[5/5] Enriching Seema Richard...
--- STAGE 4: Launching interactive email review ---

==================================================
📧 EMAIL OUTREACH PREVIEW
Recipient : Akhil Gupta (akhil.gupta@shine.com)
Company   : Shine.com
Designation: Chief Executive Officer
Subject   : Beyond Job Listings: A Fresh Perspective on Shine.com's Mission
--------------------------------------------------
Dear Mr. Gupta,

I'm writing to you today not just as a student looking for a job,
but as someone genuinely impressed by the strategic evolution of
Shine.com under your leadership...
==================================================
Action: [s]end / [k]eep/skip / [q]uit batch: s

Sending transactional email via Brevo to: akhil.gupta@shine.com
✅ Email sent successfully!

🎉 Pipeline completed. Sent: 1, Failed: 0, Skipped: 4

📊 Final Results: {
  "total": 5,
  "sent": 1,
  "failed": 0,
  "skipped": 4
}
```

## Project Structure

```
├── server.js                  # Entry point (CLI + Express server)
├── routes/
│   ├── pipelineRoutes.js      # Core pipeline logic + Express route
│   ├── companyRoutes.js       # Company search API route
│   ├── peopleRoutes.js        # People search & enrich API route
│   └── mailRoutes.js          # Standalone mail send API route
├── services/
│   ├── oceanService.js        # Ocean.io lookalike company search
│   ├── prospeoService.js      # Prospeo person search & enrichment
│   ├── brevoService.js        # OpenRouter email generation + Brevo sending
│   ├── terminalReview.js      # Interactive terminal email review
│   └── eazyreachService.js    # Legacy email enrichment (not active)
├── SYSTEM_DESIGN.md           # Architecture & flowchart (Mermaid)
├── .env                       # API keys (not committed)
└── package.json
```

## Tech Stack

- **Node.js** (ES Modules)
- **Express.js** — REST API server
- **Ocean.io API** — Lookalike company discovery
- **Prospeo API** — Person search & email enrichment
- **OpenRouter API** — LLM email generation (Gemini 2.5 Pro + Web Search)
- **Brevo API** — Transactional email delivery

## License

ISC
