const DOCUMENT_TYPES = [
  'AADHAAR',
  'LAND_RECORD',
  'EIGHT_A_EXTRACT',
  'INCOME_CERTIFICATE',
  'CASTE_CERTIFICATE',
  'DISABILITY_CERTIFICATE',
  'RATION_CARD',
  'DOMICILE_CERTIFICATE',
  'CROP_SOWING_CERTIFICATE',
  'BANK_PASSBOOK',
  'SOIL_HEALTH_CARD',
  'KCC_CARD',
];

const GENDERS = ['MALE', 'FEMALE', 'OTHER'];
const CATEGORIES = ['GENERAL', 'OBC', 'SC', 'ST'];
const OCCUPATIONS = ['FARMER', 'TENANT_FARMER', 'AGRICULTURAL_LABOURER', 'OTHER'];
const LANGUAGES = ['MARATHI', 'HINDI', 'ENGLISH'];
const FARMER_TYPES = ['INDIVIDUAL', 'JOINT', 'OTHER'];
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
  LAND_RECORD: ['name', 'landAreaHectares', 'state', 'district', 'taluka', 'village'],
  EIGHT_A_EXTRACT: ['name', 'landAreaHectares', 'state', 'district', 'taluka', 'village'],
  INCOME_CERTIFICATE: ['name', 'annualIncome', 'state', 'district'],
  CASTE_CERTIFICATE: ['name', 'category', 'state', 'district'],
  DISABILITY_CERTIFICATE: ['name', 'hasDisability', 'disabilityPercentage', 'state', 'district'],
  RATION_CARD: ['name', 'category', 'annualIncome', 'state', 'district'],
  DOMICILE_CERTIFICATE: ['name', 'state', 'district', 'taluka', 'village'],
  CROP_SOWING_CERTIFICATE: ['name', 'landAreaHectares', 'state', 'district', 'taluka', 'village'],
  BANK_PASSBOOK: ['name', 'bankName'],
  SOIL_HEALTH_CARD: ['name', 'state', 'district', 'village'],
  KCC_CARD: ['name', 'bankName'],
};

module.exports = { DOCUMENT_TYPES, GENDERS, CATEGORIES, OCCUPATIONS, INDIAN_STATES, ALLOWED_FIELDS, LANGUAGES, FARMER_TYPES };
