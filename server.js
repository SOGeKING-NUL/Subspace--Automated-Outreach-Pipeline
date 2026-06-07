import 'dotenv/config';
import express from 'express';
import companyRoutes from './routes/companyRoutes.js';
import peopleRoutes from './routes/peopleRoutes.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Subspace Automated Outreach Pipeline Backend is running.' });
});

app.use('/api/companies', companyRoutes);
app.use('/api/people', peopleRoutes);

app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});