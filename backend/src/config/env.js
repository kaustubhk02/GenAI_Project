const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

for (const key of ['MONGODB_URI', 'JWT_SECRET']) {
  if (!process.env[key]) {
    console.error(`Missing environment variable ${key}. Copy backend/.env.example to backend/.env and fill it in.`);
    process.exit(1);
  }
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  ocrServiceUrl: process.env.OCR_SERVICE_URL || 'http://127.0.0.1:8001',
  uploadDir: path.resolve(__dirname, '../..', process.env.UPLOAD_DIR || 'uploads'),
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB) || 5,
  allowTextUploads: (process.env.ALLOW_TEXT_UPLOADS || 'true') === 'true',
};
