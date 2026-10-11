const mongoose = require('mongoose');

const schemeChunkSchema = new mongoose.Schema({
  scheme: { type: mongoose.Schema.Types.ObjectId, ref: 'Scheme', required: true, index: true },
  text: { type: String, required: true },
  embedding: { type: [Number], required: true }, // Array of floats
  chunkIndex: { type: Number, default: 0 },
  sourceUrl: { type: String, default: '' },
  version: { type: Number, default: 1 },
});

module.exports = mongoose.model('SchemeChunk', schemeChunkSchema);

