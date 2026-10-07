const env = require('./config/env');
const connectDB = require('./config/db');
const app = require('./app');

(async () => {
  await connectDB();
  app.listen(env.port, () => console.log(`API listening on http://localhost:${env.port}`));
})().catch((err) => {
  console.error('Startup failed:', err.message);
  console.error('Is MongoDB running and is MONGODB_URI in backend/.env correct?');
  process.exit(1);
});
