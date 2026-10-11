const { cosineSimilarity, getEmbedding } = require('../src/services/ragService');

describe('ragService & Vector Math', () => {
  test('cosineSimilarity calculates exact 1.0 for identical vectors', () => {
    const vecA = [0.5, 0.5, 0.5, 0.5];
    const sim = cosineSimilarity(vecA, vecA);
    expect(sim).toBeCloseTo(1.0, 4);
  });

  test('cosineSimilarity calculates 0.0 for orthogonal vectors', () => {
    const vecA = [1, 0, 0];
    const vecB = [0, 1, 0];
    const sim = cosineSimilarity(vecA, vecB);
    expect(sim).toBeCloseTo(0.0, 4);
  });

  test('cosineSimilarity returns 0 for empty or null vectors', () => {
    expect(cosineSimilarity(null, [1, 2])).toBe(0);
    expect(cosineSimilarity([0, 0], [0, 0])).toBe(0);
  });

  test('getEmbedding returns valid vector embedding', async () => {
    const embedding = await getEmbedding('Sample agricultural scheme text');
    expect(Array.isArray(embedding)).toBe(true);
    expect([768, 3072]).toContain(embedding.length);
  });
});
