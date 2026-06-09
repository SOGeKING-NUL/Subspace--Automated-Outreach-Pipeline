import 'dotenv/config';

const domain = process.argv[2];

if (domain) {
  // --- CLI Mode: run pipeline directly ---
  const { runPipeline } = await import('./routes/pipelineRoutes.js');
  const limit = parseInt(process.argv[3], 10) || 10;

  try {
    const result = await runPipeline(domain, limit);
    console.log('\n📊 Final Results:', JSON.stringify(result.summary, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('\n💥 Pipeline failed:', error.message);
    process.exit(1);
  }
} else {
  // --- Server Mode: start Express API ---
  const express = (await import('express')).default;
  const companyRoutes = (await import('./routes/companyRoutes.js')).default;
  const peopleRoutes = (await import('./routes/peopleRoutes.js')).default;
  const mailRoutes = (await import('./routes/mailRoutes.js')).default;
  const pipelineRoutes = (await import('./routes/pipelineRoutes.js')).default;

  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', message: 'Automated Outreach Pipeline is running.' });
  });

  app.use('/api/companies', companyRoutes);
  app.use('/api/people', peopleRoutes);
  app.use('/api/mails', mailRoutes);
  app.use('/api/pipeline', pipelineRoutes);

  app.use((err, req, res, next) => {
    console.error('Unhandled Server Error:', err.stack);
    res.status(500).json({ error: 'Internal Server Error' });
  });

  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}