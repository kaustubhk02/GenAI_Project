export const STATES = ['Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand',
  'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi',
  'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'];

export const DOC_TYPES = {
  AADHAAR: 'Identity card (Aadhaar-style)',
  LAND_RECORD: 'Land record',
  INCOME_CERTIFICATE: 'Income certificate',
  BANK_PASSBOOK: 'Bank passbook',
};

const GENDER = ['MALE', 'FEMALE', 'OTHER'];
const CATEGORY = ['GENERAL', 'OBC', 'SC', 'ST'];
const OCCUPATION = ['FARMER', 'TENANT_FARMER', 'AGRICULTURAL_LABOURER', 'OTHER'];

// key = flat extracted-field name
export const FIELD_DEFS = {
  name: { label: 'Full name', type: 'text' },
  age: { label: 'Age', type: 'number', step: 1 },
  gender: { label: 'Gender', type: 'select', options: GENDER },
  state: { label: 'State', type: 'select', options: STATES },
  district: { label: 'District', type: 'text' },
  landAreaHectares: { label: 'Land area (hectares)', type: 'number', step: 0.01 },
  occupation: { label: 'Occupation', type: 'select', options: OCCUPATION },
  annualIncome: { label: 'Annual income (Rs)', type: 'number', step: 1 },
  category: { label: 'Category', type: 'select', options: CATEGORY },
  bankName: { label: 'Bank name', type: 'text' },
};

export const FIELDS_BY_DOC = {
  AADHAAR: ['name', 'age', 'gender', 'state', 'district'],
  LAND_RECORD: ['name', 'landAreaHectares', 'occupation', 'state', 'district'],
  INCOME_CERTIFICATE: ['name', 'annualIncome', 'category', 'state', 'district'],
  BANK_PASSBOOK: ['name', 'bankName'],
};

// profile form layout: [dotted path, flat field key]
export const PROFILE_FIELDS = [
  ['personal.name', 'name'], ['personal.age', 'age'], ['personal.gender', 'gender'],
  ['location.state', 'state'], ['location.district', 'district'],
  ['agriculture.landAreaHectares', 'landAreaHectares'], ['agriculture.occupation', 'occupation'],
  ['financial.annualIncome', 'annualIncome'], ['social.category', 'category'],
];

export const PATH_LABELS = Object.fromEntries(PROFILE_FIELDS.map(([p, k]) => [p, FIELD_DEFS[k].label]));

export const STATUS_LABEL = {
  ELIGIBLE: 'Eligible',
  ALMOST_ELIGIBLE: 'Almost eligible',
  INCOMPLETE: 'Needs more information',
  NOT_ELIGIBLE: 'Not eligible',
};
