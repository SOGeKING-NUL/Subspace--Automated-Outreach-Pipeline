# System Design — Automated Outreach Pipeline

## Overview

This pipeline automates B2B cold outreach by seamlessly chaining together four stages: discovering relevant companies, identifying key decision-makers, enriching their profiles with verified work emails, and finally generating AI-powered personalized emails that undergo human review before dispatch.

## Tools & APIs Used

- **Node.js**: The core runtime environment executing the pipeline via CLI or Express.js server.
- **Ocean.io API**: Used for discovering lookalike companies based on a seed domain.
- **Prospeo API**: Handles two critical functions:
  - **Search Person API**: Identifies decision-makers (C-Suite, VP, Founders) at target companies.
  - **Enrich Person API**: Resolves and verifies professional email addresses for the identified individuals.
- **OpenRouter API (Gemini 2.5 Pro)**: Powers the AI email generation. Crucially, it utilizes a web-search plugin to dynamically research the prospect's company in real-time before drafting the message.
- **Brevo (Sendinblue) API**: The transactional email service used to actually deliver the final, approved outreach emails from a verified sender address.
- **Terminal (Readline)**: Provides the interactive CLI interface for reviewing generated emails before they are sent.

## Pipeline Flow

The pipeline executes sequentially through the following stages:

### Stage 1: Lookalike Company Search
1. **Input**: The pipeline receives a seed domain (e.g., `docker.com`) and an optional limit.
2. **Process**: A request is sent to the Ocean.io `/v3/search/companies` endpoint, filtering for relevant locations (e.g., India).
3. **Output**: Extracts an array of lookalike company domain names. If none are found, the pipeline halts.

### Stage 2: Decision-Maker Search
1. **Input**: The array of lookalike domains from Stage 1.
2. **Process**: A request is sent to the Prospeo `/search-person` endpoint, specifically filtering for high-level seniority roles (C-Suite, Vice President, Founder/Owner).
3. **Output**: An array of prospect profiles including their name, designation, company, LinkedIn URL, and Prospeo `person_id`. If no decision-makers are found, the pipeline halts.

### Stage 3: Email Enrichment
1. **Input**: A limited slice (e.g., top 5) of the prospect profiles from Stage 2 to conserve API credits.
2. **Process**: Iterates through the prospects, calling the Prospeo `/enrich-person` endpoint for each individual. This stage includes programmatic delays and automatic retry logic with exponential backoff to gracefully handle HTTP 429 Rate Limit errors.
3. **Output**: The prospect profiles are updated with verified professional email addresses. Prospects without a resolvable email are skipped in the next stage.

### Stage 4: AI Generation & Interactive Review
1. **Input**: The enriched prospect profiles from Stage 3.
2. **AI Generation**: For each prospect, a prompt is sent to OpenRouter (using Gemini 2.5 Pro). The LLM is instructed to first perform a web search on the prospect's company to gather context, then draft a highly personalized email subject and HTML body framing the sender as a proactive student.
3. **Interactive Review**: The generated email is rendered in the terminal. The user is prompted to take action:
   - **[s]end**: The email is dispatched via the Brevo SMTP API, and marked as sent.
   - **[k]eep/skip**: The email is discarded, the prospect is marked as skipped, and the loop moves to the next person.
   - **[q]uit**: Aborts the entire batch process immediately.
4. **Output**: After processing all prospects, the pipeline outputs a final summary tallying the number of sent, failed, and skipped emails.
