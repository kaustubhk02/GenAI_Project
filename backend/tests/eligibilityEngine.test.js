const { checkEligibility, evaluateNode } = require('../src/services/eligibilityEngine');

const leaf = (field, operator, value) => ({ field, operator, value });
const profile = {
  personal: { age: 42, gender: 'MALE' },
  location: { state: 'Maharashtra' },
  agriculture: { landAreaHectares: 1.5, occupation: 'FARMER' },
  financial: { annualIncome: 180000 },
  social: { category: 'OBC' },
};

describe('operators', () => {
  test.each([
    ['=', 'Maharashtra', 'maharashtra', true],
    ['!=', 'Maharashtra', 'Gujarat', true],
    ['>', 5, 3, true], ['>', 3, 3, false],
    ['<', 2, 3, true], ['<', 3, 3, false],
    ['>=', 3, 3, true], ['<=', 3, 3, true], ['<=', 4, 3, false],
  ])('%s', (op, actual, expected, result) => {
    expect(evaluateNode(leaf('x', op, expected), { x: actual })).toBe(result);
  });
  test('IN', () => {
    expect(evaluateNode(leaf('x', 'IN', ['SC', 'ST']), { x: 'st' })).toBe(true);
    expect(evaluateNode(leaf('x', 'IN', ['SC', 'ST']), { x: 'OBC' })).toBe(false);
  });
  test('invalid operator throws', () => {
    expect(() => evaluateNode(leaf('x', '~', 1), { x: 1 })).toThrow();
  });
});

describe('boolean logic', () => {
  const T = leaf('age', '>=', 18), F = leaf('age', '<', 18);
  const p = { age: 30 };
  test('all', () => {
    expect(evaluateNode({ all: [T, T] }, p)).toBe(true);
    expect(evaluateNode({ all: [T, F] }, p)).toBe(false);
  });
  test('any', () => {
    expect(evaluateNode({ any: [F, T] }, p)).toBe(true);
    expect(evaluateNode({ any: [F, F] }, p)).toBe(false);
  });
  test('not', () => {
    expect(evaluateNode({ not: F }, p)).toBe(true);
    expect(evaluateNode({ not: T }, p)).toBe(false);
  });
  test('unknown propagates, but false dominates AND and true dominates OR', () => {
    const U = leaf('missing', '=', 1);
    expect(evaluateNode({ all: [T, U] }, p)).toBeNull();
    expect(evaluateNode({ all: [F, U] }, p)).toBe(false);
    expect(evaluateNode({ any: [F, U] }, p)).toBeNull();
    expect(evaluateNode({ any: [T, U] }, p)).toBe(true);
    expect(evaluateNode({ not: U }, p)).toBeNull();
  });
});

describe('checkEligibility statuses (worked example)', () => {
  const scheme = {
    rules: { all: [
      leaf('location.state', '=', 'Maharashtra'),
      leaf('agriculture.landAreaHectares', '<=', 2),
      leaf('financial.annualIncome', '<=', 200000),
    ] },
    requiredDocuments: ['AADHAAR', 'LAND_RECORD', 'BANK_PASSBOOK'],
  };
  const allDocs = ['AADHAAR', 'LAND_RECORD', 'BANK_PASSBOOK'];

  test('ELIGIBLE when rules pass and all documents present', () => {
    const r = checkEligibility(profile, scheme, allDocs);
    expect(r.status).toBe('ELIGIBLE');
    expect(r.matchedRules).toHaveLength(3);
    expect(r.completionPercent).toBe(100);
  });

  test('ALMOST_ELIGIBLE at 67% when one document is missing', () => {
    const r = checkEligibility(profile, scheme, ['AADHAAR', 'LAND_RECORD']);
    expect(r.status).toBe('ALMOST_ELIGIBLE');
    expect(r.missingDocuments).toEqual(['BANK_PASSBOOK']);
    expect(r.completionPercent).toBe(67);
  });

  test('NOT_ELIGIBLE when a rule fails', () => {
    const r = checkEligibility({ ...profile, financial: { annualIncome: 900000 } }, scheme, allDocs);
    expect(r.status).toBe('NOT_ELIGIBLE');
    expect(r.failedRules).toHaveLength(1);
  });

  test('missing field is INCOMPLETE, never NOT_ELIGIBLE', () => {
    const r = checkEligibility({ ...profile, financial: {} }, scheme, allDocs);
    expect(r.status).toBe('INCOMPLETE');
    expect(r.missingInformation).toEqual(['financial.annualIncome']);
  });

  test('empty profile is INCOMPLETE', () => {
    expect(checkEligibility({}, scheme, []).status).toBe('INCOMPLETE');
  });

  test('a definite failure wins over missing data', () => {
    const r = checkEligibility({ location: { state: 'Gujarat' } }, scheme, []);
    expect(r.status).toBe('NOT_ELIGIBLE');
  });
});
