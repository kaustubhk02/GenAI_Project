const DOCUMENT_TYPES = ['AADHAAR', 'LAND_RECORD', 'INCOME_CERTIFICATE', 'BANK_PASSBOOK'];
const GENDERS = ['MALE', 'FEMALE', 'OTHER'];
const CATEGORIES = ['GENERAL', 'OBC', 'SC', 'ST'];
const OCCUPATIONS = ['FARMER', 'TENANT_FARMER', 'AGRICULTURAL_LABOURER', 'OTHER'];
const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
  'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];
// Which extracted fields each document type may contribute. Aadhaar / account numbers are
// deliberately NOT extracted or stored (data minimisation).
const ALLOWED_FIELDS = {
  AADHAAR: ['name', 'age', 'gender', 'state', 'district'],
  LAND_RECORD: ['name', 'landAreaHectares', 'occupation', 'state', 'district'],
  INCOME_CERTIFICATE: ['name', 'annualIncome', 'category', 'state', 'district'],
  BANK_PASSBOOK: ['name', 'bankName'],
};

module.exports = { DOCUMENT_TYPES, GENDERS, CATEGORIES, OCCUPATIONS, INDIAN_STATES, ALLOWED_FIELDS };
