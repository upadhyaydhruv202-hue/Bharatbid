import type { NormalizedSourceRecord, VerificationIdentifierTypeName, VerificationSourceName } from './types';

export interface DemoRegistryRecord {
  identifierType: VerificationIdentifierTypeName;
  identifier: string;
  legalName: string;
  tradeName: string | null;
  status: string;
  registrationDate: string | null;
  state: string;
  attributes?: Record<string, string | null>;
}

export const DEMO_GST_RECORDS: DemoRegistryRecord[] = [
  {
    identifierType: 'gstin',
    identifier: '33AAAPB1234C1Z5',
    legalName: 'Bayfront Engineering Private Limited',
    tradeName: 'Bayfront Valves',
    status: 'ACTIVE',
    registrationDate: '2014-06-12',
    state: 'Tamil Nadu',
    attributes: {
      gstReturnStatus: 'FILED',
      gstReturnPeriod: 'FY 2025-26',
    },
  },
  {
    identifierType: 'gstin',
    identifier: '24ABCDE1234F1Z5',
    legalName: 'ABC Technologies Private Limited',
    tradeName: 'ABC Tech',
    status: 'ACTIVE',
    registrationDate: '2018-01-15',
    state: 'Gujarat',
    attributes: {
      gstReturnStatus: 'NOT_FILED',
      gstReturnPeriod: 'FY 2025-26',
    },
  },
  {
    identifierType: 'gstin',
    identifier: '29AACPD3456E1Z8',
    legalName: 'Southern Petrochem Wholesale Private Limited',
    tradeName: 'SPW',
    status: 'ACTIVE',
    registrationDate: '2016-09-01',
    state: 'Karnataka',
    attributes: {
      gstReturnStatus: 'DELAYED',
      gstReturnPeriod: 'FY 2025-26',
    },
  },
  {
    identifierType: 'gstin',
    identifier: '27AAEPF5678G1Z4',
    legalName: 'Frontier Labs Consumables',
    tradeName: null,
    status: 'ACTIVE',
    registrationDate: '2019-04-20',
    state: 'Maharashtra',
    attributes: {
      gstReturnStatus: 'NOT_AVAILABLE',
      gstReturnPeriod: null,
    },
  },
];

export const DEMO_MCA_RECORDS: DemoRegistryRecord[] = [
  {
    identifierType: 'cin',
    identifier: 'U29120TN2014PTC095001',
    legalName: 'Bayfront Engineering Private Limited',
    tradeName: null,
    status: 'Active',
    registrationDate: '2014-06-12',
    state: 'Tamil Nadu',
  },
];

export const DEMO_UDYAM_RECORDS: DemoRegistryRecord[] = [
  {
    identifierType: 'udyam',
    identifier: 'UDYAM-TN-02-0001001',
    legalName: 'Bayfront Engineering Private Limited',
    tradeName: 'Bayfront Valves',
    status: 'Active',
    registrationDate: '2021-02-10',
    state: 'Tamil Nadu',
  },
];

export const DEMO_PAN_RECORDS: DemoRegistryRecord[] = [
  {
    identifierType: 'pan',
    identifier: 'AAAPB1234C',
    legalName: 'Bayfront Engineering Private Limited',
    tradeName: 'Bayfront Valves',
    status: 'ACTIVE',
    registrationDate: '2012-03-01',
    state: 'Tamil Nadu',
    attributes: { entityType: 'Company' },
  },
  {
    identifierType: 'pan',
    identifier: 'AACPD3456E',
    legalName: 'Delta Petrochem Traders',
    tradeName: 'Delta Supplies',
    status: 'ACTIVE',
    registrationDate: '2016-09-01',
    state: 'Karnataka',
    attributes: { entityType: 'Firm' },
  },
];

export const DEMO_INCOME_TAX_RECORDS: DemoRegistryRecord[] = [
  {
    identifierType: 'pan',
    identifier: 'AAAPB1234C',
    legalName: 'Bayfront Engineering Private Limited',
    tradeName: null,
    status: 'FILED',
    registrationDate: null,
    state: 'Tamil Nadu',
    attributes: { assessmentYear: 'AY 2025-26', returnType: 'ITR-6', filingStatus: 'FILED' },
  },
  {
    identifierType: 'pan',
    identifier: 'AACPD3456E',
    legalName: 'Delta Petrochem Traders',
    tradeName: null,
    status: 'DELAYED',
    registrationDate: null,
    state: 'Karnataka',
    attributes: { assessmentYear: 'AY 2025-26', returnType: 'ITR-3', filingStatus: 'DELAYED' },
  },
];

export const DEMO_EPFO_RECORDS: DemoRegistryRecord[] = [
  {
    identifierType: 'epfo',
    identifier: 'DEMO-EPFO-TN-001',
    legalName: 'Bayfront Engineering Private Limited',
    tradeName: null,
    status: 'ACTIVE',
    registrationDate: '2015-01-20',
    state: 'Tamil Nadu',
    attributes: { registrationStatus: 'REGISTERED' },
  },
];

export const DEMO_ESIC_RECORDS: DemoRegistryRecord[] = [
  {
    identifierType: 'esic',
    identifier: 'DEMO-ESIC-TN-001',
    legalName: 'Bayfront Engineering Private Limited',
    tradeName: null,
    status: 'ACTIVE',
    registrationDate: '2015-02-01',
    state: 'Tamil Nadu',
    attributes: { registrationStatus: 'REGISTERED' },
  },
];

export const DEMO_DPIIT_RECORDS: DemoRegistryRecord[] = [
  {
    identifierType: 'dpiit',
    identifier: 'DEMO-DPIIT-001',
    legalName: 'Bayfront Engineering Private Limited',
    tradeName: 'Bayfront Valves',
    status: 'RECOGNIZED',
    registrationDate: '2022-06-01',
    state: 'Tamil Nadu',
    attributes: { recognitionNumber: 'DEMO-DPIIT-001', validity: '2027-06-01' },
  },
];

export const DEMO_NSIC_RECORDS: DemoRegistryRecord[] = [
  {
    identifierType: 'nsic',
    identifier: 'DEMO-NSIC-001',
    legalName: 'Bayfront Engineering Private Limited',
    tradeName: 'Bayfront Valves',
    status: 'ACTIVE',
    registrationDate: '2020-08-15',
    state: 'Tamil Nadu',
    attributes: { validity: '2027-08-15' },
  },
];

export const DEMO_GEM_RECORDS: DemoRegistryRecord[] = [
  {
    identifierType: 'gem_seller',
    identifier: 'DEMO-GEM-001',
    legalName: 'Bayfront Engineering Private Limited',
    tradeName: 'Bayfront Valves',
    status: 'ACTIVE',
    registrationDate: '2019-11-01',
    state: 'Tamil Nadu',
    attributes: { sellerReference: 'DEMO-GEM-001' },
  },
  {
    identifierType: 'gem_seller',
    identifier: 'DEMO-GEM-002',
    legalName: 'Delta Petrochem Traders',
    tradeName: 'Delta Supplies',
    status: 'INACTIVE',
    registrationDate: '2020-01-10',
    state: 'Karnataka',
    attributes: { sellerReference: 'DEMO-GEM-002' },
  },
];

export const DEMO_DEBARMENT_RECORDS: DemoRegistryRecord[] = [
  {
    identifierType: 'pan',
    identifier: 'AACPD3456E',
    legalName: 'Delta Petrochem Traders',
    tradeName: 'Delta Supplies',
    status: 'RECORD_FOUND',
    registrationDate: '2025-01-15',
    state: 'Karnataka',
    attributes: {
      reference: 'DEMO-DEB-2025-014',
      effectiveDate: '2025-01-15',
      expiryDate: '2027-01-14',
      reasonCategory: 'Contractual default (synthetic)',
    },
  },
];

export const DEMO_BIS_RECORDS: DemoRegistryRecord[] = [
  {
    identifierType: 'bis',
    identifier: 'DEMO-BIS-001',
    legalName: 'Bayfront Engineering Private Limited',
    tradeName: 'Bayfront Valves',
    status: 'ACTIVE',
    registrationDate: '2021-04-01',
    state: 'Tamil Nadu',
    attributes: { productCategory: 'Industrial valves', validity: '2028-03-31' },
  },
];

/** Synthetic GSTIN used only to exercise adapter error handling. Not a live identifier. */
export const DEMO_GST_ERROR_IDENTIFIER = '00ERROR1234E1Z5';

export function toSourceRecord(
  source: VerificationSourceName,
  displayName: string,
  record: DemoRegistryRecord,
): NormalizedSourceRecord {
  return {
    source,
    sourceMode: 'demo',
    sourceDisplayName: displayName,
    recordFound: true,
    retrievedAt: new Date().toISOString(),
    identifierType: record.identifierType,
    identifier: record.identifier,
    legalName: record.legalName,
    tradeName: record.tradeName,
    status: record.status,
    registrationDate: record.registrationDate,
    state: record.state,
    attributes: record.attributes,
  };
}
