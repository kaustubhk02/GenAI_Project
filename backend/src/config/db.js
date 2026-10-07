const mongoose = require('mongoose');
const env = require('./env');

module.exports = async function connectDB() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 5000 });
  console.log('MongoDB connected');
};
