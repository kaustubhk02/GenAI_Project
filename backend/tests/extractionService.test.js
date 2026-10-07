const fs = require('fs');
const path = require('path');
const { extractFields } = require('../src/services/extractionService');

const read = (f) => fs.readFileSync(path.join(__dirname, '../../database/sample-documents', f), 'utf8');
const NOW = new Date('2026-10-06');

test('income certificate', () => {
  const { data, warnings } = extractFields(read('income_certificate_sample.txt'), 'INCOME_CERTIFICATE', NOW);
  expect(data).toEqual({ name: 'Rajesh Patil', annualIncome: 180000, category: 'OBC', state: 'Maharashtra', district: 'Pune' });
  expect(warnings).toHaveLength(0);
});
test('land record', () => {
  const { data } = extractFields(read('land_record_sample.txt'), 'LAND_RECORD', NOW);
  expect(data).toEqual({ name: 'Rajesh Patil', landAreaHectares: 1.5, occupation: 'FARMER', state: 'Maharashtra', district: 'Pune' });
});
test('identity card (age from DOB, no ID number extracted)', () => {
  const { data } = extractFields(read('aadhaar_sample.txt'), 'AADHAAR', NOW);
  expect(data).toEqual({ name: 'Rajesh Patil', age: 42, gender: 'MALE', state: 'Maharashtra', district: 'Pune' });
});
test('bank passbook', () => {
  const { data } = extractFields(read('bank_passbook_sample.txt'), 'BANK_PASSBOOK', NOW);
  expect(data.name).toBe('Rajesh Patil');
  expect(data.bankName).toMatch(/Bank/);
});
test('acres are converted to hectares and garbage is flagged', () => {
  const { data } = extractFields('Owner Name: A B\nTotal Area: 5 acres\nState: Atlantis', 'LAND_RECORD', NOW);
  expect(data.landAreaHectares).toBe(2.02);
  expect(data.state).toBeUndefined();
});
test('unreadable text yields warnings, not crashes', () => {
  const { data, warnings } = extractFields('zzz', 'INCOME_CERTIFICATE', NOW);
  expect(data).toEqual({});
  expect(warnings.length).toBeGreaterThan(0);
});
