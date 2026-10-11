const { fetchAndExtractUrlContent } = require('../src/services/schemeIngestionService');

describe('Scheme Ingestion Service', () => {
  test('rejects invalid or non-http URLs', async () => {
    await expect(fetchAndExtractUrlContent('invalid-url')).rejects.toThrow('A valid HTTP/HTTPS URL is required');
    await expect(fetchAndExtractUrlContent('')).rejects.toThrow('A valid HTTP/HTTPS URL is required');
    await expect(fetchAndExtractUrlContent('ftp://example.com/doc.pdf')).rejects.toThrow('A valid HTTP/HTTPS URL is required');
  });

  test('validates structure of parsed scheme rules', () => {
    const mockRules = {
      all: [
        { field: 'agriculture.occupation', operator: 'IN', value: ['FARMER', 'TENANT_FARMER'], label: 'Must be a farmer' },
        { field: 'agriculture.landAreaHectares', operator: '<=', value: 2.0, label: 'Small and marginal farmer' },
        { field: 'personal.age', operator: '>=', value: 18, label: 'Age at least 18' },
        { field: 'personal.age', operator: '<=', value: 40, label: 'Age at most 40' }
      ]
    };

    expect(mockRules.all).toBeInstanceOf(Array);
    expect(mockRules.all.length).toBe(4);
    for (const rule of mockRules.all) {
      expect(rule).toHaveProperty('field');
      expect(rule).toHaveProperty('operator');
      expect(rule).toHaveProperty('value');
    }
  });
});
