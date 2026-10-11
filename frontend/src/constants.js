export const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand',
  'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi',
  'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

export const DOC_TYPES = {
  LAND_RECORD: '7/12 Extract / Land Record (७/१२ उतारा व जमीन नोंदणी)',
  EIGHT_A_EXTRACT: '8A Land Holding Extract (८-अ उतारा - खाते नोंदणी)',
  AADHAAR: 'Identity Card / Aadhaar Card (आधार कार्ड)',
  INCOME_CERTIFICATE: 'Income Certificate (उत्पन्न प्रमाणपत्र)',
  CASTE_CERTIFICATE: 'Caste Certificate (जात प्रमाणपत्र)',
  DISABILITY_CERTIFICATE: 'Disability Certificate / UDID (दिव्यांग प्रमाणपत्र)',
  RATION_CARD: 'Ration Card (रेशन कार्ड / शिधापत्रिका)',
  DOMICILE_CERTIFICATE: 'Domicile / Residence Certificate (रहिवासी दाखला / अधिवास)',
  CROP_SOWING_CERTIFICATE: 'Crop Sowing / E-Pik Pahani (ई-पीक पाहणी / पेरणी नोंद)',
  BANK_PASSBOOK: 'Bank Passbook (बँक पासबुक)',
  SOIL_HEALTH_CARD: 'Soil Health Card (मृदा आरोग्य पत्रिका)',
  KCC_CARD: 'Kisan Credit Card (किसान क्रेडिट कार्ड)',
};

const GENDER = ['MALE', 'FEMALE', 'OTHER'];
const CATEGORY = ['GENERAL', 'OBC', 'SC', 'ST'];
const OCCUPATION = ['FARMER', 'TENANT_FARMER', 'AGRICULTURAL_LABOURER', 'OTHER'];
const LANGUAGES = ['MARATHI', 'HINDI', 'ENGLISH'];
const FARMER_TYPES = ['INDIVIDUAL', 'JOINT', 'OTHER'];

export const FIELD_DEFS = {
  name: { label: 'Full name', type: 'text' },
  mobileNumber: { label: 'Mobile Number', type: 'text' },
  preferredLanguage: { label: 'Preferred Language', type: 'select', options: LANGUAGES },
  age: { label: 'Age', type: 'number', step: 1 },
  gender: { label: 'Gender', type: 'select', options: GENDER },
  state: { label: 'State', type: 'select', options: STATES },
  district: { label: 'District', type: 'text' },
  taluka: { label: 'Taluka', type: 'text' },
  village: { label: 'Village', type: 'text' },
  landAreaHectares: { label: 'Land area (hectares)', type: 'number', step: 0.01 },
  occupation: { label: 'Occupation', type: 'select', options: OCCUPATION },
  farmerType: { label: 'Farmer Type', type: 'select', options: FARMER_TYPES },
  annualIncome: { label: 'Annual income (₹)', type: 'number', step: 1 },
  category: { label: 'Category', type: 'select', options: CATEGORY },
  hasDisability: { label: 'Person with Disability (Divyang)?', type: 'select', options: ['YES', 'NO'] },
  disabilityPercentage: { label: 'Disability Percentage (%)', type: 'number', step: 1 },
  bankName: { label: 'Bank name', type: 'text' },
  // Multi-year income records extracted from income certificates
  incomeRecords: { label: 'Income records (all years)', type: 'income-records' },
};

export const FIELDS_BY_DOC = {
  LAND_RECORD: ['name', 'landAreaHectares', 'state', 'district', 'taluka', 'village'],
  EIGHT_A_EXTRACT: ['name', 'landAreaHectares', 'state', 'district', 'taluka', 'village'],
  AADHAAR: ['name', 'age', 'gender', 'state', 'district'],
  INCOME_CERTIFICATE: ['name', 'annualIncome', 'state', 'district', 'incomeRecords'],
  CASTE_CERTIFICATE: ['name', 'category', 'state', 'district'],
  DISABILITY_CERTIFICATE: ['name', 'hasDisability', 'disabilityPercentage', 'state', 'district'],
  RATION_CARD: ['name', 'category', 'annualIncome', 'state', 'district'],
  DOMICILE_CERTIFICATE: ['name', 'state', 'district', 'taluka', 'village'],
  CROP_SOWING_CERTIFICATE: ['name', 'landAreaHectares', 'state', 'district', 'taluka', 'village'],
  BANK_PASSBOOK: ['name', 'bankName'],
  SOIL_HEALTH_CARD: ['name', 'state', 'district', 'village'],
  KCC_CARD: ['name', 'bankName'],
};

// profile form layout: [dotted path, flat field key]
export const PROFILE_FIELDS = [
  ['personal.name', 'name'], ['personal.mobileNumber', 'mobileNumber'], ['personal.preferredLanguage', 'preferredLanguage'], 
  ['personal.age', 'age'], ['personal.gender', 'gender'],
  ['location.state', 'state'], ['location.district', 'district'], ['location.taluka', 'taluka'], ['location.village', 'village'],
  ['agriculture.landAreaHectares', 'landAreaHectares'], ['agriculture.occupation', 'occupation'], ['agriculture.farmerType', 'farmerType'],
  ['financial.annualIncome', 'annualIncome'], ['social.category', 'category'],
  ['social.hasDisability', 'hasDisability'], ['social.disabilityPercentage', 'disabilityPercentage'],
];

export const PATH_LABELS = Object.fromEntries(PROFILE_FIELDS.map(([p, k]) => [p, FIELD_DEFS[k]?.label || k]));

export const STATUS_LABEL = {
  ELIGIBLE: 'Eligible',
  ALMOST_ELIGIBLE: 'Almost eligible',
  INCOMPLETE: 'Needs more information',
  NOT_ELIGIBLE: 'Not eligible',
};
