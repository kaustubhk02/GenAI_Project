const {
  validateApprovedUrl,
  computeContentHash,
  isMaterialRuleChange,
} = require('../src/services/schemeSyncService');

describe('Scheme Synchronization Service', () => {
  describe('SSRF Protection & Approved Domain Validation', () => {
    test('accepts approved government and statutory domains', () => {
      expect(() => validateApprovedUrl('https://pmkisan.gov.in/Documents/PM-KMY%20-%20FAQs.pdf')).not.toThrow();
      expect(() => validateApprovedUrl('https://agrimachinery.nic.in/guidelines.pdf')).not.toThrow();
      expect(() => validateApprovedUrl('https://www.nabard.org/content1.aspx?id=599')).not.toThrow();
      expect(() => validateApprovedUrl('https://mahadbt.maharashtra.gov.in/')).not.toThrow();
    });

    test('rejects loopback and private IP addresses (SSRF protection)', () => {
      expect(() => validateApprovedUrl('http://localhost:5000/admin')).toThrow(/private\/loopback/i);
      expect(() => validateApprovedUrl('http://127.0.0.1:8001/ocr')).toThrow(/private\/loopback/i);
      expect(() => validateApprovedUrl('http://192.168.1.100/secret')).toThrow(/private\/loopback/i);
      expect(() => validateApprovedUrl('http://10.0.0.1/')).toThrow(/private\/loopback/i);
      expect(() => validateApprovedUrl('http://169.254.169.254/latest/meta-data')).toThrow(/private\/loopback/i);
    });

    test('rejects unapproved external domains', () => {
      expect(() => validateApprovedUrl('https://random-commercial-site.com/scheme.pdf')).toThrow(/not in the approved/i);
      expect(() => validateApprovedUrl('https://malicious-site.xyz/')).toThrow(/not in the approved/i);
    });
  });

  describe('Content Hash & Change Detection', () => {
    test('produces deterministic SHA-256 hashes', () => {
      const textA = 'Sample government scheme guidelines content.';
      const textB = 'Sample government scheme guidelines content.';
      const textC = 'Different government scheme guidelines content.';

      const hashA = computeContentHash(textA);
      const hashB = computeContentHash(textB);
      const hashC = computeContentHash(textC);

      expect(hashA).toBe(hashB);
      expect(hashA).not.toBe(hashC);
      expect(hashA).toHaveLength(64); // SHA-256 hex length
    });
  });

  describe('Safe Material Rule Conflict Handling', () => {
    const activeScheme = {
      code: 'PM-KMY',
      benefitAmountPerYear: 36000,
      rules: {
        all: [
          { field: 'agriculture.occupation', operator: 'IN', value: ['FARMER'], label: 'Must be a farmer' },
          { field: 'agriculture.landAreaHectares', operator: '<=', value: 2.0, label: 'Land up to 2 Ha' }
        ]
      }
    };

    test('flags material change when benefit amount changes', () => {
      const candidate = {
        benefitAmountPerYear: 40000,
        rules: activeScheme.rules
      };
      expect(isMaterialRuleChange(activeScheme, candidate)).toBe(true);
    });

    test('flags material change when rule criteria or thresholds change', () => {
      const candidate = {
        benefitAmountPerYear: 36000,
        rules: {
          all: [
            { field: 'agriculture.occupation', operator: 'IN', value: ['FARMER'], label: 'Must be a farmer' },
            { field: 'agriculture.landAreaHectares', operator: '<=', value: 5.0, label: 'Land up to 5 Ha' }
          ]
        }
      };
      expect(isMaterialRuleChange(activeScheme, candidate)).toBe(true);
    });

    test('returns false when rules and benefits are identical', () => {
      const candidate = {
        benefitAmountPerYear: 36000,
        rules: {
          all: [
            { field: 'agriculture.occupation', operator: 'IN', value: ['FARMER'], label: 'Must be a farmer' },
            { field: 'agriculture.landAreaHectares', operator: '<=', value: 2.0, label: 'Land up to 2 Ha' }
          ]
        }
      };
      expect(isMaterialRuleChange(activeScheme, candidate)).toBe(false);
    });
  });
});
