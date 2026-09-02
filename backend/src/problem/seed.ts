import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import type { PrismaClient } from '@prisma/client';

import { resolveLocalStorageDir } from '../integrations/storage/storage.keys';
import { AUDIT_ACTIONS } from '../constants';
import { DEFAULT_DEPARTMENT_NAME, DEFAULT_ORGANIZATION_NAME } from './types';
import { compareClaimsToSource, notFoundExplanation } from './verification/compare';
import { asSourceSnapshot, compareVerificationPair } from './intelligence/compare';
import type { CrossComparisonTypeName } from './intelligence/types';
import { DEMO_GST_ERROR_IDENTIFIER, DEMO_GST_RECORDS, DEMO_MCA_RECORDS, DEMO_UDYAM_RECORDS, DEMO_PAN_RECORDS, DEMO_INCOME_TAX_RECORDS, DEMO_EPFO_RECORDS, DEMO_ESIC_RECORDS, DEMO_NSIC_RECORDS, DEMO_GEM_RECORDS, DEMO_DEBARMENT_RECORDS, DEMO_BIS_RECORDS, toSourceRecord } from './verification/fixtures';
import { DEMO_SOURCE_ADVISORY, ERROR_DISCLAIMER, VERIFICATION_SOURCE_LABELS } from './verification/types';

const ORG = DEFAULT_ORGANIZATION_NAME;
const DEPT = DEFAULT_DEPARTMENT_NAME;

function id(label: string): string {
  const hex = createHash('sha1').update(`bharatbid-demo:${label}`).digest('hex').slice(0, 12);
  return `11111111-1111-4111-8111-${hex}`;
}

export async function seedBharatBidDemoData(prisma: PrismaClient): Promise<void> {
  const tenders = [
    {
      id: id('tender000001'),
      referenceNumber: 'GEM/2026/B/CPCL/001',
      title: 'Supply of industrial valves for Manali refinery turnaround',
      description: 'Procurement of certified industrial valves and spares for the scheduled turnaround. Statutory GST, PAN, and MSME evidence will be verified in later workflow slices.',
      organizationName: ORG,
      departmentName: DEPT,
      category: 'Goods',
      status: 'open' as const,
      issueDate: new Date('2026-07-01T00:00:00.000Z'),
      closingDate: new Date('2026-09-15T18:30:00.000Z'),
    },
    {
      id: id('tender000002'),
      referenceNumber: 'GEM/2026/B/CPCL/002',
      title: 'Annual maintenance contract for electrical substations',
      description: 'Comprehensive AMC covering preventive and breakdown maintenance of 33/11 kV substations.',
      organizationName: ORG,
      departmentName: DEPT,
      category: 'Services',
      status: 'under_evaluation' as const,
      issueDate: new Date('2026-05-10T00:00:00.000Z'),
      closingDate: new Date('2026-07-31T18:30:00.000Z'),
    },
    {
      id: id('tender000003'),
      referenceNumber: 'GEM/2026/B/CPCL/003',
      title: 'Works contract for jetty pipeline coating',
      description: 'Surface preparation and coating of product pipelines at the jetty. Make in India and OEM authorisation will be assessed later.',
      organizationName: ORG,
      departmentName: 'Engineering Projects',
      category: 'Works',
      status: 'draft' as const,
      issueDate: new Date('2026-08-20T00:00:00.000Z'),
      closingDate: new Date('2026-10-30T18:30:00.000Z'),
    },
    {
      id: id('tender000004'),
      referenceNumber: 'GEM/2026/B/CPCL/004',
      title: 'Supply of laboratory reagents and glassware',
      description: 'Rate contract for QC laboratory consumables for FY 2026-27.',
      organizationName: ORG,
      departmentName: 'Quality Control',
      category: 'Goods',
      status: 'closed' as const,
      issueDate: new Date('2026-03-01T00:00:00.000Z'),
      closingDate: new Date('2026-04-30T18:30:00.000Z'),
    },
    {
      id: id('tender000005'),
      referenceNumber: 'GEM/2026/B/CPCL/005',
      title: 'IT infrastructure refresh for procurement office',
      description: 'Supply and installation of workstations, switches, and secure storage for the contracts team.',
      organizationName: ORG,
      departmentName: 'Information Systems',
      category: 'IT',
      status: 'awarded' as const,
      issueDate: new Date('2026-01-15T00:00:00.000Z'),
      closingDate: new Date('2026-03-15T18:30:00.000Z'),
    },
  ];

  for (const tender of tenders) {
    await prisma.tender.upsert({
      where: { id: tender.id },
      update: {
        referenceNumber: tender.referenceNumber,
        title: tender.title,
        description: tender.description,
        organizationName: tender.organizationName,
        departmentName: tender.departmentName,
        category: tender.category,
        status: tender.status,
        issueDate: tender.issueDate,
        closingDate: tender.closingDate,
      },
      create: tender,
    });
  }

  const requirementSets: Array<{
    tenderId: string;
    items: Array<{
      id: string;
      name: string;
      description: string;
      requirementType:
        | 'statutory'
        | 'eligibility'
        | 'document'
        | 'financial'
        | 'technical'
        | 'organizational'
        | 'declaration'
        | 'tender_specific'
        | 'other';
      mandatory: boolean;
      sortOrder: number;
    }>;
  }> = [
    {
      tenderId: id('tender000001'),
      items: [
        { id: id('req000000001'), name: 'PAN of the bidding entity', description: 'PAN must belong to the legal entity submitting the bid.', requirementType: 'statutory', mandatory: true, sortOrder: 0 },
        { id: id('req000000002'), name: 'GST registration', description: 'Active GSTIN matching the bidder legal name.', requirementType: 'statutory', mandatory: true, sortOrder: 1 },
        { id: id('req000000003'), name: 'Udyam / MSME evidence if claimed', description: 'Required only if MSME purchase preference is claimed.', requirementType: 'eligibility', mandatory: false, sortOrder: 2 },
        { id: id('req000000014'), name: 'Technical capability statement', description: 'Evidence of similar valve supply for refinery or process plants.', requirementType: 'technical', mandatory: true, sortOrder: 3 },
        { id: id('req000000015'), name: 'Financial eligibility', description: 'Average annual turnover for the last three financial years.', requirementType: 'financial', mandatory: true, sortOrder: 4 },
        { id: id('req000000020'), name: 'EPFO registration', description: 'DEMO EPFO registration evidence for the bidding entity.', requirementType: 'statutory', mandatory: false, sortOrder: 5 },
        { id: id('req000000021'), name: 'ESIC registration', description: 'DEMO ESIC registration evidence where applicable.', requirementType: 'statutory', mandatory: false, sortOrder: 6 },
        { id: id('req000000022'), name: 'NSIC registration if claimed', description: 'NSIC registration when purchase preference is claimed.', requirementType: 'eligibility', mandatory: false, sortOrder: 7 },
        { id: id('req000000023'), name: 'Debarment / blacklist source check', description: 'Officer inspects DEMO debarment source results. Not an automatic rejection.', requirementType: 'statutory', mandatory: true, sortOrder: 8 },
        { id: id('req000000024'), name: 'BIS licence where specified', description: 'BIS licence for specified valve categories.', requirementType: 'technical', mandatory: false, sortOrder: 9 },
        { id: id('req000000025'), name: 'Income Tax return filing status', description: 'DEMO ITR filing status for officer inspection.', requirementType: 'statutory', mandatory: false, sortOrder: 10 },
      ],
    },
    {
      tenderId: id('tender000002'),
      items: [
        { id: id('req000000005'), name: 'PAN of the bidding entity', description: 'PAN of the AMC contractor.', requirementType: 'statutory', mandatory: true, sortOrder: 0 },
        { id: id('req000000006'), name: 'GST registration', description: 'Active GSTIN for invoicing of maintenance services.', requirementType: 'statutory', mandatory: true, sortOrder: 1 },
        { id: id('req000000016'), name: 'OEM authorisation', description: 'Manufacturer authorisation for switchgear and protection relays.', requirementType: 'document', mandatory: true, sortOrder: 2 },
        { id: id('req000000007'), name: 'Technical capability document', description: 'Experience in electrical substation maintenance with at least three similar AMCs.', requirementType: 'technical', mandatory: true, sortOrder: 3 },
      ],
    },
    {
      tenderId: id('tender000003'),
      items: [
        { id: id('req000000017'), name: 'PAN of the bidding entity', description: 'PAN of the works contractor.', requirementType: 'statutory', mandatory: true, sortOrder: 0 },
        { id: id('req000000018'), name: 'GST registration', description: 'Active GSTIN for works contract invoicing.', requirementType: 'statutory', mandatory: true, sortOrder: 1 },
        { id: id('req000000019'), name: 'Startup India recognition if claimed', description: 'DPIIT recognition certificate when startup relaxation is claimed.', requirementType: 'eligibility', mandatory: false, sortOrder: 2 },
        { id: id('req000000008'), name: 'Make in India local content declaration', description: 'Self-declaration of local content class.', requirementType: 'declaration', mandatory: true, sortOrder: 3 },
      ],
    },
    {
      tenderId: id('tender000004'),
      items: [
        { id: id('req000000010'), name: 'GST invoice capability', description: 'Bidder must be able to raise GST-compliant invoices.', requirementType: 'statutory', mandatory: true, sortOrder: 0 },
      ],
    },
    {
      tenderId: id('tender000005'),
      items: [
        { id: id('req000000011'), name: 'ISO 9001 certificate', description: 'Quality management certification of the OEM or bidder.', requirementType: 'organizational', mandatory: false, sortOrder: 0 },
        { id: id('req000000012'), name: 'Tender-specific unpriced BOM', description: 'Unpriced bill of materials matching the technical specification.', requirementType: 'tender_specific', mandatory: true, sortOrder: 1 },
        { id: id('req000000013'), name: 'Startup India recognition if claimed', description: 'DPIIT recognition certificate when startup relaxation is claimed.', requirementType: 'eligibility', mandatory: false, sortOrder: 2 },
      ],
    },
  ];

  for (const set of requirementSets) {
    for (const item of set.items) {
      await prisma.tenderRequirement.upsert({
        where: { id: item.id },
        update: {
          tenderId: set.tenderId,
          name: item.name,
          description: item.description,
          requirementType: item.requirementType,
          mandatory: item.mandatory,
          active: true,
          sortOrder: item.sortOrder,
        },
        create: {
          id: item.id,
          tenderId: set.tenderId,
          name: item.name,
          description: item.description,
          requirementType: item.requirementType,
          mandatory: item.mandatory,
          active: true,
          sortOrder: item.sortOrder,
        },
      });
    }
  }

  const bidders = [
    {
      id: id('bidder000001'),
      legalName: 'Bayfront Engineering Private Limited',
      tradeName: 'Bayfront Valves',
      pan: 'AAAPB1234C',
      gstin: '33AAAPB1234C1Z5',
      cin: 'U29120TN2014PTC095001',
      udyamRegistrationNumber: 'UDYAM-TN-02-0001001',
      registeredAddress: '14 GST Road, Guindy Industrial Estate',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600032',
      contactName: 'Kavitha Raman',
      contactEmail: 'kavitha.demo@bayfront.example',
      contactPhone: '+919840010001',
    },
    {
      id: id('bidder000002'),
      legalName: 'Coromandel Maintenance Services LLP',
      tradeName: 'CMS Electricals',
      pan: 'AABPC2345D',
      gstin: '33AABPC2345D1Z2',
      cin: null,
      udyamRegistrationNumber: null,
      registeredAddress: '88 Anna Salai',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600002',
      contactName: 'Suresh Natarajan',
      contactEmail: 'suresh.demo@cms.example',
      contactPhone: '+919840010002',
    },
    {
      id: id('bidder000003'),
      legalName: 'Delta Petrochem Traders',
      tradeName: 'Delta Supplies',
      pan: 'AACPD3456E',
      gstin: '29AACPD3456E1Z8',
      cin: null,
      udyamRegistrationNumber: 'UDYAM-KA-03-0002002',
      registeredAddress: 'Peenya Industrial Area',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560058',
      contactName: 'Meera Iyer',
      contactEmail: 'meera.demo@delta.example',
      contactPhone: '+919840010003',
    },
    {
      id: id('bidder000004'),
      legalName: 'Eastern Coatings India Private Limited',
      tradeName: null,
      pan: 'AADPE4567F',
      gstin: '33AADPE4567F1Z1',
      cin: 'U24222TN2018PTC122004',
      udyamRegistrationNumber: 'UDYAM-TN-02-0003003',
      registeredAddress: 'Ambattur Industrial Estate',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600058',
      contactName: 'Arun Prakash',
      contactEmail: 'arun.demo@easterncoatings.example',
      contactPhone: '+919840010004',
    },
    {
      id: id('bidder000005'),
      legalName: 'Frontier Labs Consumables',
      tradeName: 'Frontier Labs',
      pan: 'AAEPF5678G',
      gstin: '27AAEPF5678G1Z4',
      cin: null,
      udyamRegistrationNumber: 'UDYAM-MH-18-0004004',
      registeredAddress: 'Andheri East',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400069',
      contactName: 'Neha Kulkarni',
      contactEmail: 'neha.demo@frontierlabs.example',
      contactPhone: '+919840010005',
    },
    {
      id: id('bidder000006'),
      legalName: 'Gulfshore IT Systems Private Limited',
      tradeName: 'Gulfshore IT',
      pan: 'AAGPG6789H',
      gstin: '33AAGPG6789H1Z6',
      cin: 'U72900TN2016PTC110006',
      udyamRegistrationNumber: 'UDYAM-TN-02-0005005',
      registeredAddress: 'OMR, Perungudi',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600096',
      contactName: 'Vikram Sethi',
      contactEmail: 'vikram.demo@gulfshore.example',
      contactPhone: '+919840010006',
    },
    {
      id: id('bidder000007'),
      legalName: 'Harbour Crane Spares',
      tradeName: 'Harbour Spares',
      pan: 'AAHPH7890J',
      gstin: '33AAHPH7890J1Z3',
      cin: null,
      udyamRegistrationNumber: null,
      registeredAddress: 'Ennore High Road',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600057',
      contactName: 'Lakshmi Venkatesh',
      contactEmail: 'lakshmi.demo@harbour.example',
      contactPhone: '+919840010007',
    },
    {
      id: id('bidder000008'),
      legalName: 'Indigo Process Controls Limited',
      tradeName: 'Indigo Controls',
      pan: 'AAIPI8901K',
      gstin: '24AAIPI8901K1Z7',
      cin: 'L33110GJ2009PLC055008',
      udyamRegistrationNumber: null,
      registeredAddress: 'GIDC Vatva',
      city: 'Ahmedabad',
      state: 'Gujarat',
      pincode: '382445',
      contactName: 'Rohit Desai',
      contactEmail: 'rohit.demo@indigo.example',
      contactPhone: '+919840010008',
    },
    {
      id: id('bidder000009'),
      legalName: 'Jubilee Safety Appliances',
      tradeName: 'Jubilee Safety',
      pan: 'AAJPJ9012L',
      gstin: '33AAJPJ9012L1Z0',
      cin: null,
      udyamRegistrationNumber: 'UDYAM-TN-02-0006006',
      registeredAddress: 'SIDCO Industrial Estate, Ambattur',
      city: 'Chennai',
      state: 'Tamil Nadu',
      pincode: '600098',
      contactName: 'Priya Menon',
      contactEmail: 'priya.demo@jubilee.example',
      contactPhone: '+919840010009',
    },
    {
      id: id('bidder000010'),
      legalName: 'Kaveri Instrumentation Works',
      tradeName: 'Kaveri Instruments',
      pan: 'AAKPK0123M',
      gstin: '33AAKPK0123M1Z9',
      cin: null,
      udyamRegistrationNumber: 'UDYAM-TN-02-0007007',
      registeredAddress: 'Tiruchirappalli Industrial Estate',
      city: 'Tiruchirappalli',
      state: 'Tamil Nadu',
      pincode: '620014',
      contactName: 'Ganesh Murugan',
      contactEmail: 'ganesh.demo@kaveri.example',
      contactPhone: '+919840010010',
    },
  ];

  for (const bidder of bidders) {
    await prisma.bidder.upsert({
      where: { id: bidder.id },
      update: bidder,
      create: bidder,
    });
  }

  const bids: Array<{
    id: string;
    tenderId: string;
    bidderId: string;
    submissionReference: string;
    status: 'draft' | 'submitted' | 'under_review' | 'withdrawn' | 'finalized';
    submittedAt: Date | null;
  }> = [
    { id: id('bid000000001'), tenderId: id('tender000001'), bidderId: id('bidder000001'), submissionReference: 'BID-GEM2026BCPCL001-0001', status: 'submitted', submittedAt: new Date('2026-08-12T10:00:00.000Z') },
    { id: id('bid000000002'), tenderId: id('tender000001'), bidderId: id('bidder000003'), submissionReference: 'BID-GEM2026BCPCL001-0002', status: 'submitted', submittedAt: new Date('2026-08-14T11:30:00.000Z') },
    { id: id('bid000000003'), tenderId: id('tender000001'), bidderId: id('bidder000007'), submissionReference: 'BID-GEM2026BCPCL001-0003', status: 'submitted', submittedAt: new Date('2026-08-18T09:15:00.000Z') },
    { id: id('bid000000004'), tenderId: id('tender000001'), bidderId: id('bidder000008'), submissionReference: 'BID-GEM2026BCPCL001-0004', status: 'withdrawn', submittedAt: new Date('2026-08-05T11:00:00.000Z') },
    { id: id('bid000000005'), tenderId: id('tender000002'), bidderId: id('bidder000002'), submissionReference: 'BID-GEM2026BCPCL002-0001', status: 'under_review', submittedAt: new Date('2026-07-20T08:40:00.000Z') },
    { id: id('bid000000006'), tenderId: id('tender000002'), bidderId: id('bidder000001'), submissionReference: 'BID-GEM2026BCPCL002-0002', status: 'under_review', submittedAt: new Date('2026-07-21T14:20:00.000Z') },
    { id: id('bid000000007'), tenderId: id('tender000002'), bidderId: id('bidder000004'), submissionReference: 'BID-GEM2026BCPCL002-0003', status: 'submitted', submittedAt: new Date('2026-07-22T16:05:00.000Z') },
    { id: id('bid000000008'), tenderId: id('tender000003'), bidderId: id('bidder000004'), submissionReference: 'BID-GEM2026BCPCL003-0001', status: 'draft', submittedAt: null },
    { id: id('bid000000009'), tenderId: id('tender000004'), bidderId: id('bidder000005'), submissionReference: 'BID-GEM2026BCPCL004-0001', status: 'finalized', submittedAt: new Date('2026-04-10T10:00:00.000Z') },
    { id: id('bid000000010'), tenderId: id('tender000004'), bidderId: id('bidder000003'), submissionReference: 'BID-GEM2026BCPCL004-0002', status: 'finalized', submittedAt: new Date('2026-04-12T12:30:00.000Z') },
    { id: id('bid000000011'), tenderId: id('tender000004'), bidderId: id('bidder000009'), submissionReference: 'BID-GEM2026BCPCL004-0003', status: 'withdrawn', submittedAt: new Date('2026-04-02T09:00:00.000Z') },
    { id: id('bid000000012'), tenderId: id('tender000005'), bidderId: id('bidder000006'), submissionReference: 'BID-GEM2026BCPCL005-0001', status: 'finalized', submittedAt: new Date('2026-03-01T11:45:00.000Z') },
    { id: id('bid000000013'), tenderId: id('tender000005'), bidderId: id('bidder000001'), submissionReference: 'BID-GEM2026BCPCL005-0002', status: 'finalized', submittedAt: new Date('2026-03-02T15:10:00.000Z') },
    { id: id('bid000000014'), tenderId: id('tender000002'), bidderId: id('bidder000010'), submissionReference: 'BID-GEM2026BCPCL002-0004', status: 'under_review', submittedAt: new Date('2026-07-25T07:55:00.000Z') },
    { id: id('bid000000015'), tenderId: id('tender000001'), bidderId: id('bidder000010'), submissionReference: 'BID-GEM2026BCPCL001-0005', status: 'submitted', submittedAt: new Date('2026-08-20T13:25:00.000Z') },
  ];

  for (const bid of bids) {
    await prisma.bidSubmission.upsert({
      where: { id: bid.id },
      update: bid,
      create: bid,
    });
  }

  const officer = await prisma.user.findUnique({ where: { email: 'demo.officer@example.com' } });
  await seedSyntheticBidDocuments(prisma, officer?.id ?? null);
  await seedDemoVerifications(prisma, officer?.id ?? null);
  await seedDemoCrossVerifications(prisma, officer?.id ?? null);
  await seedDemoReviews(prisma, officer?.id ?? null);
  await seedDemoEvaluations(prisma, officer?.id ?? null);
  await seedDemoNotifications(prisma, officer?.id ?? null);
  await seedDemoActivity(prisma, officer?.id ?? null);
}

function syntheticText(title: string, body: string): Buffer {
  return Buffer.from(
    `DEMO / SYNTHETIC\nThis is not a government-issued document.\n\n${title}\n\n${body}\n`,
    'utf8',
  );
}

async function seedSyntheticBidDocuments(prisma: PrismaClient, uploadedById: string | null): Promise<void> {
  const storageRoot = resolveLocalStorageDir(process.env.STORAGE_LOCAL_DIR ?? 'storage');
  const bidId = id('bid000000001');
  const files: Array<{
    id: string;
    groupId: string;
    versionNumber: number;
    isCurrent: boolean;
    documentType:
      | 'gst_certificate'
      | 'pan'
      | 'udyam_certificate'
      | 'experience_certificate'
      | 'financial_statement'
      | 'oem_authorization'
      | 'epfo_certificate'
      | 'esic_certificate'
      | 'nsic_certificate'
      | 'dpiit_certificate'
      | 'bis_licence'
      | 'declaration'
      | 'other';
    filename: string;
    requirementId: string | null;
    status: 'ready' | 'archived';
    extractionStatus: 'completed' | 'failed';
    buffer: Buffer;
  }> = [
    {
      id: id('doc000000001'),
      groupId: id('docgroup00001'),
      versionNumber: 1,
      isCurrent: false,
      documentType: 'gst_certificate',
      filename: 'DEMO_GST_Certificate_v1.txt',
      requirementId: id('req000000002'),
      status: 'archived',
      extractionStatus: 'completed',
      buffer: syntheticText('GST Certificate (superseded)', 'Synthetic GSTIN placeholder 33AAAPB1234C1Z5. Not verified.'),
    },
    {
      id: id('doc000000002'),
      groupId: id('docgroup00001'),
      versionNumber: 2,
      isCurrent: true,
      documentType: 'gst_certificate',
      filename: 'DEMO_GST_Certificate.txt',
      requirementId: id('req000000002'),
      status: 'ready',
      extractionStatus: 'completed',
      buffer: syntheticText(
        'GST Certificate',
        [
          'Legal Name: Bayfront Engineering Private Limited',
          'State: Tamil Nadu',
          'GSTIN: 33AAAPB1234C1Z5',
          'Extracted value is not verified.',
          'DEMO DigiLocker authenticity: ISSUED',
          'This is a synthetic demonstration result and is not connected to DigiLocker.',
        ].join('\n'),
      ),
    },
    {
      id: id('doc000000003'),
      groupId: id('docgroup00002'),
      versionNumber: 1,
      isCurrent: true,
      documentType: 'pan',
      filename: 'DEMO_PAN.txt',
      requirementId: id('req000000001'),
      status: 'ready',
      extractionStatus: 'completed',
      buffer: syntheticText('PAN document', 'Synthetic PAN placeholder AAAPB1234C. Extracted value is not verified.'),
    },
    {
      id: id('doc000000004'),
      groupId: id('docgroup00003'),
      versionNumber: 1,
      isCurrent: true,
      documentType: 'udyam_certificate',
      filename: 'DEMO_Udyam.txt',
      requirementId: null,
      status: 'ready',
      extractionStatus: 'completed',
      buffer: syntheticText(
        'Udyam Certificate',
        [
          'Enterprise Name: Bayfront Engineering Private Limited',
          'State: Tamil Nadu',
          'UDYAM Number: UDYAM-TN-02-0001001',
          'Unmapped to a requirement.',
        ].join('\n'),
      ),
    },
    {
      id: id('doc000000005'),
      groupId: id('docgroup00004'),
      versionNumber: 1,
      isCurrent: true,
      documentType: 'experience_certificate',
      filename: 'DEMO_Experience.txt',
      requirementId: id('req000000014'),
      status: 'ready',
      extractionStatus: 'completed',
      buffer: syntheticText('Experience Certificate', 'Synthetic record of similar valve supply. Not a qualification decision.'),
    },
    {
      id: id('doc000000006'),
      groupId: id('docgroup00005'),
      versionNumber: 1,
      isCurrent: true,
      documentType: 'financial_statement',
      filename: 'DEMO_Financial_Statement.txt',
      requirementId: id('req000000015'),
      status: 'ready',
      extractionStatus: 'completed',
      buffer: syntheticText('Financial Statement', 'Synthetic turnover figures for demo only.'),
    },
    {
      id: id('doc000000007'),
      groupId: id('docgroup00006'),
      versionNumber: 1,
      isCurrent: true,
      documentType: 'oem_authorization',
      filename: 'DEMO_OEM_Authorization.txt',
      requirementId: null,
      status: 'ready',
      extractionStatus: 'completed',
      buffer: syntheticText(
        'OEM Authorization',
        [
          'OEM name: Bayfront Valves OEM',
          'Product: Industrial valves',
          'Authorization reference: DEMO-OEM-001',
          'Valid from: 2024-01-01',
          'Valid until: 2028-12-31',
          'DEMO DigiLocker authenticity: ISSUED',
        ].join('\n'),
      ),
    },
    {
      id: id('doc000000010'),
      groupId: id('docgroup00010'),
      versionNumber: 1,
      isCurrent: true,
      documentType: 'epfo_certificate',
      filename: 'DEMO_EPFO.txt',
      requirementId: id('req000000020'),
      status: 'ready',
      extractionStatus: 'completed',
      buffer: syntheticText('EPFO Certificate', 'Legal Name: Bayfront Engineering Private Limited\nDEMO-EPFO-TN-001\nState: Tamil Nadu'),
    },
    {
      id: id('doc000000011'),
      groupId: id('docgroup00011'),
      versionNumber: 1,
      isCurrent: true,
      documentType: 'esic_certificate',
      filename: 'DEMO_ESIC.txt',
      requirementId: id('req000000021'),
      status: 'ready',
      extractionStatus: 'completed',
      buffer: syntheticText('ESIC Certificate', 'Legal Name: Bayfront Engineering Private Limited\nDEMO-ESIC-TN-001'),
    },
    {
      id: id('doc000000012'),
      groupId: id('docgroup00012'),
      versionNumber: 1,
      isCurrent: true,
      documentType: 'nsic_certificate',
      filename: 'DEMO_NSIC.txt',
      requirementId: id('req000000022'),
      status: 'ready',
      extractionStatus: 'completed',
      buffer: syntheticText('NSIC Certificate', 'Legal Name: Bayfront Engineering Private Limited\nDEMO-NSIC-001'),
    },
    {
      id: id('doc000000013'),
      groupId: id('docgroup00013'),
      versionNumber: 1,
      isCurrent: true,
      documentType: 'bis_licence',
      filename: 'DEMO_BIS.txt',
      requirementId: id('req000000024'),
      status: 'ready',
      extractionStatus: 'completed',
      buffer: syntheticText('BIS Licence', 'Legal Name: Bayfront Engineering Private Limited\nDEMO-BIS-001\nProduct: Industrial valves'),
    },
    {
      id: id('doc000000014'),
      groupId: id('docgroup00014'),
      versionNumber: 1,
      isCurrent: true,
      documentType: 'declaration',
      filename: 'DEMO_Make_in_India.txt',
      requirementId: null,
      status: 'ready',
      extractionStatus: 'completed',
      buffer: syntheticText(
        'Make in India declaration',
        'Make in India class: CLASS_I\nLocal content: 72%\nLegal Name: Bayfront Engineering Private Limited',
      ),
    },
  ];

  for (const file of files) {
    const storageKey = `bids/${bidId}/documents/${file.id}/v${file.versionNumber}`;
    const fullPath = path.join(storageRoot, ...storageKey.split('/'));
    mkdirSync(path.dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, file.buffer);
    const checksum = createHash('sha256').update(file.buffer).digest('hex');
    const text = file.buffer.toString('utf8');
    await prisma.bidDocument.upsert({
      where: { id: file.id },
      update: {
        bidSubmissionId: bidId,
        tenderRequirementId: file.requirementId,
        groupId: file.groupId,
        versionNumber: file.versionNumber,
        isCurrent: file.isCurrent,
        documentType: file.documentType,
        originalFilename: file.filename,
        storedFilename: file.filename,
        mimeType: 'text/plain',
        extension: 'txt',
        sizeBytes: file.buffer.length,
        storageKey,
        checksumSha256: checksum,
        status: file.status,
        extractionStatus: file.extractionStatus,
        extractedText: text,
        extractedAt: new Date('2026-08-12T11:00:00.000Z'),
        extractionEngine: 'bharatbid-text-extract',
        uploadedById,
        archivedAt: file.status === 'archived' ? new Date('2026-08-10T09:00:00.000Z') : null,
      },
      create: {
        id: file.id,
        bidSubmissionId: bidId,
        tenderRequirementId: file.requirementId,
        groupId: file.groupId,
        versionNumber: file.versionNumber,
        isCurrent: file.isCurrent,
        documentType: file.documentType,
        originalFilename: file.filename,
        storedFilename: file.filename,
        mimeType: 'text/plain',
        extension: 'txt',
        sizeBytes: file.buffer.length,
        storageKey,
        checksumSha256: checksum,
        status: file.status,
        extractionStatus: file.extractionStatus,
        extractedText: text,
        extractedAt: new Date('2026-08-12T11:00:00.000Z'),
        extractionEngine: 'bharatbid-text-extract',
        uploadedById,
        archivedAt: file.status === 'archived' ? new Date('2026-08-10T09:00:00.000Z') : null,
      },
    });
  }

  await seedMismatchGstDocument(prisma, uploadedById);
}

async function seedMismatchGstDocument(prisma: PrismaClient, uploadedById: string | null): Promise<void> {
  const storageRoot = resolveLocalStorageDir(process.env.STORAGE_LOCAL_DIR ?? 'storage');
  const bidId = id('bid000000002');
  const fileId = id('doc000000008');
  const buffer = syntheticText(
    'GST Certificate',
    [
      'Legal Name: Delta Petrochem Traders',
      'State: Karnataka',
      'GSTIN: 29AACPD3456E1Z8',
      'Extracted value is not verified.',
    ].join('\n'),
  );
  const storageKey = `bids/${bidId}/documents/${fileId}/v1`;
  const fullPath = path.join(storageRoot, ...storageKey.split('/'));
  mkdirSync(path.dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, buffer);
  const checksum = createHash('sha256').update(buffer).digest('hex');
  const text = buffer.toString('utf8');
  await prisma.bidDocument.upsert({
    where: { id: fileId },
    update: {
      bidSubmissionId: bidId,
      tenderRequirementId: id('req000000002'),
      groupId: id('docgroup00008'),
      versionNumber: 1,
      isCurrent: true,
      documentType: 'gst_certificate',
      originalFilename: 'DEMO_GST_Certificate_Delta.txt',
      storedFilename: 'DEMO_GST_Certificate_Delta.txt',
      mimeType: 'text/plain',
      extension: 'txt',
      sizeBytes: buffer.length,
      storageKey,
      checksumSha256: checksum,
      status: 'ready',
      extractionStatus: 'completed',
      extractedText: text,
      extractedAt: new Date('2026-08-20T10:00:00.000Z'),
      extractionEngine: 'bharatbid-text-extract',
      uploadedById,
    },
    create: {
      id: fileId,
      bidSubmissionId: bidId,
      tenderRequirementId: id('req000000002'),
      groupId: id('docgroup00008'),
      versionNumber: 1,
      isCurrent: true,
      documentType: 'gst_certificate',
      originalFilename: 'DEMO_GST_Certificate_Delta.txt',
      storedFilename: 'DEMO_GST_Certificate_Delta.txt',
      mimeType: 'text/plain',
      extension: 'txt',
      sizeBytes: buffer.length,
      storageKey,
      checksumSha256: checksum,
      status: 'ready',
      extractionStatus: 'completed',
      extractedText: text,
      extractedAt: new Date('2026-08-20T10:00:00.000Z'),
      extractionEngine: 'bharatbid-text-extract',
      uploadedById,
    },
  });
}

function extendedDemoVerifications(now: Date) {
  const bayfront = {
    legalName: 'Bayfront Engineering Private Limited',
    legalNameOrigin: 'extracted' as const,
    state: 'Tamil Nadu',
    stateOrigin: 'extracted' as const,
  };
  const matched = [
    { id: 'verif0000010', documentId: 'doc000000003', group: 'vergroup0010', type: 'pan' as const, source: 'pan' as const, record: DEMO_PAN_RECORDS[0] },
    { id: 'verif0000011', documentId: 'doc000000003', group: 'vergroup0011', type: 'pan' as const, source: 'income_tax' as const, record: DEMO_INCOME_TAX_RECORDS[0] },
    { id: 'verif0000012', documentId: 'doc000000010', group: 'vergroup0012', type: 'epfo' as const, source: 'epfo' as const, record: DEMO_EPFO_RECORDS[0] },
    { id: 'verif0000013', documentId: 'doc000000011', group: 'vergroup0013', type: 'esic' as const, source: 'esic' as const, record: DEMO_ESIC_RECORDS[0] },
    { id: 'verif0000014', documentId: 'doc000000012', group: 'vergroup0014', type: 'nsic' as const, source: 'nsic' as const, record: DEMO_NSIC_RECORDS[0] },
    { id: 'verif0000015', documentId: null, group: 'vergroup0015', type: 'gem_seller' as const, source: 'gem' as const, record: DEMO_GEM_RECORDS[0] },
    { id: 'verif0000016', documentId: 'doc000000013', group: 'vergroup0016', type: 'bis' as const, source: 'bis' as const, record: DEMO_BIS_RECORDS[0] },
  ].map((item) => {
    const compared = compareClaimsToSource(
      { identifier: item.record.identifier, ...bayfront },
      toSourceRecord(item.source, VERIFICATION_SOURCE_LABELS[item.source], item.record),
    );
    return {
      id: id(item.id),
      bidSubmissionId: id('bid000000001'),
      bidderId: id('bidder000001'),
      documentId: item.documentId ? id(item.documentId) : null,
      groupId: id(item.group),
      attemptNumber: 1,
      identifierType: item.type,
      identifierValue: item.record.identifier,
      identifierOrigin: 'extracted' as const,
      source: item.source,
      sourceDisplayName: VERIFICATION_SOURCE_LABELS[item.source],
      status: compared.status,
      explanation: compared.explanation,
      fieldComparisons: compared.fields,
      sourceSnapshot: toSourceRecord(item.source, VERIFICATION_SOURCE_LABELS[item.source], item.record),
    };
  });
  const deltaDebarment = compareClaimsToSource(
    {
      identifier: DEMO_DEBARMENT_RECORDS[0].identifier,
      legalName: 'Delta Petrochem Traders',
      legalNameOrigin: 'extracted',
      state: 'Karnataka',
      stateOrigin: 'extracted',
    },
    toSourceRecord('debarment', VERIFICATION_SOURCE_LABELS.debarment, DEMO_DEBARMENT_RECORDS[0]),
  );
  const deltaGem = compareClaimsToSource(
    {
      identifier: DEMO_GEM_RECORDS[1].identifier,
      legalName: 'Delta Petrochem Traders',
      legalNameOrigin: 'extracted',
      state: 'Karnataka',
      stateOrigin: 'extracted',
    },
    toSourceRecord('gem', VERIFICATION_SOURCE_LABELS.gem, DEMO_GEM_RECORDS[1]),
  );
  return [
    ...matched,
    {
      id: id('verif0000017'),
      bidSubmissionId: id('bid000000001'),
      bidderId: id('bidder000001'),
      documentId: null,
      groupId: id('vergroup0017'),
      attemptNumber: 1,
      identifierType: 'pan' as const,
      identifierValue: 'AAAPB1234C',
      identifierOrigin: 'bidder_profile' as const,
      source: 'debarment' as const,
      sourceDisplayName: VERIFICATION_SOURCE_LABELS.debarment,
      status: 'not_found' as const,
      explanation: `${notFoundExplanation(VERIFICATION_SOURCE_LABELS.debarment)}\n\nNo DEMO debarment record was found. This is not a government clearance certificate.`,
      fieldComparisons: [],
      sourceSnapshot: {
        recordFound: false,
        source: 'debarment',
        sourceMode: 'demo',
        sourceDisplayName: VERIFICATION_SOURCE_LABELS.debarment,
        identifier: 'AAAPB1234C',
        retrievedAt: now.toISOString(),
      },
    },
    {
      id: id('verif0000018'),
      bidSubmissionId: id('bid000000002'),
      bidderId: id('bidder000003'),
      documentId: null,
      groupId: id('vergroup0018'),
      attemptNumber: 1,
      identifierType: 'pan' as const,
      identifierValue: DEMO_DEBARMENT_RECORDS[0].identifier,
      identifierOrigin: 'bidder_profile' as const,
      source: 'debarment' as const,
      sourceDisplayName: VERIFICATION_SOURCE_LABELS.debarment,
      status: deltaDebarment.status,
      explanation: deltaDebarment.explanation,
      fieldComparisons: deltaDebarment.fields,
      sourceSnapshot: toSourceRecord('debarment', VERIFICATION_SOURCE_LABELS.debarment, DEMO_DEBARMENT_RECORDS[0]),
    },
    {
      id: id('verif0000019'),
      bidSubmissionId: id('bid000000002'),
      bidderId: id('bidder000003'),
      documentId: null,
      groupId: id('vergroup0019'),
      attemptNumber: 1,
      identifierType: 'gem_seller' as const,
      identifierValue: DEMO_GEM_RECORDS[1].identifier,
      identifierOrigin: 'manual' as const,
      source: 'gem' as const,
      sourceDisplayName: VERIFICATION_SOURCE_LABELS.gem,
      status: deltaGem.status,
      explanation: deltaGem.explanation,
      fieldComparisons: deltaGem.fields,
      sourceSnapshot: toSourceRecord('gem', VERIFICATION_SOURCE_LABELS.gem, DEMO_GEM_RECORDS[1]),
    },
  ];
}

async function seedDemoVerifications(prisma: PrismaClient, requestedById: string | null): Promise<void> {
  const gst = VERIFICATION_SOURCE_LABELS.gst;
  const mca = VERIFICATION_SOURCE_LABELS.mca;
  const udyam = VERIFICATION_SOURCE_LABELS.udyam;
  const bayfrontGst = DEMO_GST_RECORDS[0];
  const deltaGst = DEMO_GST_RECORDS[2];
  const bayfrontMca = DEMO_MCA_RECORDS[0];
  const bayfrontUdyam = DEMO_UDYAM_RECORDS[0];
  const now = new Date('2026-08-30T12:40:00.000Z');

  const matchedGst = compareClaimsToSource(
    {
      identifier: bayfrontGst.identifier,
      legalName: 'Bayfront Engineering Private Limited',
      legalNameOrigin: 'extracted',
      state: 'Tamil Nadu',
      stateOrigin: 'extracted',
    },
    toSourceRecord('gst', gst, bayfrontGst),
  );
  const matchedMca = compareClaimsToSource(
    {
      identifier: bayfrontMca.identifier,
      legalName: 'Bayfront Engineering Private Limited',
      legalNameOrigin: 'bidder_profile',
      state: 'Tamil Nadu',
      stateOrigin: 'bidder_profile',
    },
    toSourceRecord('mca', mca, bayfrontMca),
  );
  const matchedUdyam = compareClaimsToSource(
    {
      identifier: bayfrontUdyam.identifier,
      legalName: 'Bayfront Engineering Private Limited',
      legalNameOrigin: 'extracted',
      state: 'Tamil Nadu',
      stateOrigin: 'extracted',
    },
    toSourceRecord('udyam', udyam, bayfrontUdyam),
  );
  const mismatchedGst = compareClaimsToSource(
    {
      identifier: deltaGst.identifier,
      legalName: 'Delta Petrochem Traders',
      legalNameOrigin: 'extracted',
      state: 'Karnataka',
      stateOrigin: 'extracted',
    },
    toSourceRecord('gst', gst, deltaGst),
  );

  const rows = [
    {
      id: id('verif0000001'),
      bidSubmissionId: id('bid000000001'),
      bidderId: id('bidder000001'),
      documentId: id('doc000000002'),
      groupId: id('vergroup0001'),
      attemptNumber: 1,
      identifierType: 'gstin' as const,
      identifierValue: bayfrontGst.identifier,
      identifierOrigin: 'extracted' as const,
      source: 'gst' as const,
      sourceDisplayName: gst,
      status: matchedGst.status,
      explanation: matchedGst.explanation,
      fieldComparisons: matchedGst.fields,
      sourceSnapshot: toSourceRecord('gst', gst, { ...bayfrontGst }),
    },
    {
      id: id('verif0000002'),
      bidSubmissionId: id('bid000000001'),
      bidderId: id('bidder000001'),
      documentId: null,
      groupId: id('vergroup0002'),
      attemptNumber: 1,
      identifierType: 'cin' as const,
      identifierValue: bayfrontMca.identifier,
      identifierOrigin: 'bidder_profile' as const,
      source: 'mca' as const,
      sourceDisplayName: mca,
      status: matchedMca.status,
      explanation: matchedMca.explanation,
      fieldComparisons: matchedMca.fields,
      sourceSnapshot: toSourceRecord('mca', mca, bayfrontMca),
    },
    {
      id: id('verif0000003'),
      bidSubmissionId: id('bid000000001'),
      bidderId: id('bidder000001'),
      documentId: id('doc000000004'),
      groupId: id('vergroup0003'),
      attemptNumber: 1,
      identifierType: 'udyam' as const,
      identifierValue: bayfrontUdyam.identifier,
      identifierOrigin: 'extracted' as const,
      source: 'udyam' as const,
      sourceDisplayName: udyam,
      status: matchedUdyam.status,
      explanation: matchedUdyam.explanation,
      fieldComparisons: matchedUdyam.fields,
      sourceSnapshot: toSourceRecord('udyam', udyam, bayfrontUdyam),
    },
    {
      id: id('verif0000004'),
      bidSubmissionId: id('bid000000002'),
      bidderId: id('bidder000003'),
      documentId: id('doc000000008'),
      groupId: id('vergroup0004'),
      attemptNumber: 1,
      identifierType: 'gstin' as const,
      identifierValue: deltaGst.identifier,
      identifierOrigin: 'extracted' as const,
      source: 'gst' as const,
      sourceDisplayName: gst,
      status: mismatchedGst.status,
      explanation: mismatchedGst.explanation,
      fieldComparisons: mismatchedGst.fields,
      sourceSnapshot: toSourceRecord('gst', gst, deltaGst),
    },
    {
      id: id('verif0000005'),
      bidSubmissionId: id('bid000000003'),
      bidderId: id('bidder000007'),
      documentId: null,
      groupId: id('vergroup0005'),
      attemptNumber: 1,
      identifierType: 'gstin' as const,
      identifierValue: '33AAHPH7890J1Z3',
      identifierOrigin: 'bidder_profile' as const,
      source: 'gst' as const,
      sourceDisplayName: gst,
      status: 'not_found' as const,
      explanation: notFoundExplanation(gst),
      fieldComparisons: [],
      sourceSnapshot: {
        recordFound: false,
        source: 'gst',
        sourceMode: 'demo',
        sourceDisplayName: gst,
        identifier: '33AAHPH7890J1Z3',
        retrievedAt: now.toISOString(),
      },
    },
    {
      id: id('verif0000006'),
      bidSubmissionId: id('bid000000005'),
      bidderId: id('bidder000002'),
      documentId: null,
      groupId: id('vergroup0006'),
      attemptNumber: 1,
      identifierType: 'gstin' as const,
      identifierValue: DEMO_GST_ERROR_IDENTIFIER,
      identifierOrigin: 'manual' as const,
      source: 'gst' as const,
      sourceDisplayName: gst,
      status: 'error' as const,
      explanation: `${ERROR_DISCLAIMER}\n\nSource: ${gst}\nMode: DEMO / SIMULATED\n${DEMO_SOURCE_ADVISORY}`,
      fieldComparisons: [],
      sourceSnapshot: null,
      errorCode: 'SOURCE_UNAVAILABLE',
      errorMessage: `${gst} could not complete this lookup`,
    },
    {
      id: id('verif0000007'),
      bidSubmissionId: id('bid000000002'),
      bidderId: id('bidder000003'),
      documentId: null,
      groupId: id('vergroup0007'),
      attemptNumber: 1,
      identifierType: 'cin' as const,
      identifierValue: 'U24100KA2015PTC200002',
      identifierOrigin: 'manual' as const,
      source: 'mca' as const,
      sourceDisplayName: mca,
      status: 'matched' as const,
      explanation: 'DEMO MCA snapshot for cross-check demonstration.',
      fieldComparisons: [],
      sourceSnapshot: {
        source: 'mca',
        sourceMode: 'demo',
        sourceDisplayName: mca,
        recordFound: true,
        retrievedAt: now.toISOString(),
        identifierType: 'cin',
        identifier: 'U24100KA2015PTC200002',
        legalName: 'Delta Petrochem Traders',
        tradeName: 'Delta Supplies',
        status: 'Active',
        registrationDate: '2015-03-01',
        state: 'Karnataka',
      },
    },
    {
      id: id('verif0000008'),
      bidSubmissionId: id('bid000000003'),
      bidderId: id('bidder000007'),
      documentId: null,
      groupId: id('vergroup0008'),
      attemptNumber: 1,
      identifierType: 'cin' as const,
      identifierValue: 'U29120TN2014PTC000999',
      identifierOrigin: 'manual' as const,
      source: 'mca' as const,
      sourceDisplayName: mca,
      status: 'not_found' as const,
      explanation: notFoundExplanation(mca),
      fieldComparisons: [],
      sourceSnapshot: {
        recordFound: false,
        source: 'mca',
        sourceMode: 'demo',
        sourceDisplayName: mca,
        identifier: 'U29120TN2014PTC000999',
        retrievedAt: now.toISOString(),
      },
    },
    ...extendedDemoVerifications(now),
  ];

  for (const row of rows) {
    await prisma.bidVerification.upsert({
      where: { id: row.id },
      update: {
        bidSubmissionId: row.bidSubmissionId,
        bidderId: row.bidderId,
        documentId: row.documentId,
        groupId: row.groupId,
        attemptNumber: row.attemptNumber,
        isLatest: true,
        identifierType: row.identifierType,
        identifierValue: row.identifierValue,
        identifierOrigin: row.identifierOrigin,
        source: row.source,
        sourceMode: 'demo',
        sourceDisplayName: row.sourceDisplayName,
        status: row.status,
        explanation: row.explanation,
        fieldComparisons: JSON.parse(JSON.stringify(row.fieldComparisons)),
        sourceSnapshot: row.sourceSnapshot === null ? undefined : JSON.parse(JSON.stringify(row.sourceSnapshot)),
        errorCode: 'errorCode' in row ? row.errorCode : null,
        errorMessage: 'errorMessage' in row ? row.errorMessage : null,
        requestedAt: now,
        completedAt: now,
        requestedById,
      },
      create: {
        id: row.id,
        bidSubmissionId: row.bidSubmissionId,
        bidderId: row.bidderId,
        documentId: row.documentId,
        groupId: row.groupId,
        attemptNumber: row.attemptNumber,
        isLatest: true,
        identifierType: row.identifierType,
        identifierValue: row.identifierValue,
        identifierOrigin: row.identifierOrigin,
        source: row.source,
        sourceMode: 'demo',
        sourceDisplayName: row.sourceDisplayName,
        status: row.status,
        explanation: row.explanation,
        fieldComparisons: JSON.parse(JSON.stringify(row.fieldComparisons)),
        sourceSnapshot: row.sourceSnapshot === null ? undefined : JSON.parse(JSON.stringify(row.sourceSnapshot)),
        errorCode: 'errorCode' in row ? row.errorCode : null,
        errorMessage: 'errorMessage' in row ? row.errorMessage : null,
        requestedAt: now,
        completedAt: now,
        requestedById,
      },
    });
  }
}

async function seedDemoCrossVerifications(prisma: PrismaClient, requestedById: string | null): Promise<void> {
  const now = new Date('2026-08-30T12:50:00.000Z');
  const pairs: Array<{
    id: string;
    leftId: string;
    rightId: string;
    comparisonType: CrossComparisonTypeName;
    bidId: string;
    bidderId: string;
    groupId: string;
  }> = [
    {
      id: id('cross0000001'),
      leftId: id('verif0000001'),
      rightId: id('verif0000002'),
      comparisonType: 'gst_mca',
      bidId: id('bid000000001'),
      bidderId: id('bidder000001'),
      groupId: id('crossgroup0001'),
    },
    {
      id: id('cross0000002'),
      leftId: id('verif0000001'),
      rightId: id('verif0000003'),
      comparisonType: 'gst_udyam',
      bidId: id('bid000000001'),
      bidderId: id('bidder000001'),
      groupId: id('crossgroup0002'),
    },
    {
      id: id('cross0000003'),
      leftId: id('verif0000002'),
      rightId: id('verif0000003'),
      comparisonType: 'mca_udyam',
      bidId: id('bid000000001'),
      bidderId: id('bidder000001'),
      groupId: id('crossgroup0003'),
    },
    {
      id: id('cross0000004'),
      leftId: id('verif0000004'),
      rightId: id('verif0000007'),
      comparisonType: 'gst_mca',
      bidId: id('bid000000002'),
      bidderId: id('bidder000003'),
      groupId: id('crossgroup0004'),
    },
    {
      id: id('cross0000005'),
      leftId: id('verif0000005'),
      rightId: id('verif0000008'),
      comparisonType: 'gst_mca',
      bidId: id('bid000000003'),
      bidderId: id('bidder000007'),
      groupId: id('crossgroup0005'),
    },
  ];

  for (const pair of pairs) {
    const left = await prisma.bidVerification.findUniqueOrThrow({ where: { id: pair.leftId } });
    const right = await prisma.bidVerification.findUniqueOrThrow({ where: { id: pair.rightId } });
    const compared = compareVerificationPair({
      leftStatus: left.status,
      rightStatus: right.status,
      leftSource: left.source,
      rightSource: right.source,
      leftMode: left.sourceMode,
      rightMode: right.sourceMode,
      leftDisplayName: left.sourceDisplayName,
      rightDisplayName: right.sourceDisplayName,
      leftSnapshot: asSourceSnapshot(left.sourceSnapshot),
      rightSnapshot: asSourceSnapshot(right.sourceSnapshot),
    });
    const data = {
      bidSubmissionId: pair.bidId,
      bidderId: pair.bidderId,
      leftVerificationId: left.id,
      rightVerificationId: right.id,
      comparisonType: pair.comparisonType,
      status: compared.status,
      sourceBasis: compared.sourceBasis,
      leftSource: left.source,
      rightSource: right.source,
      leftSourceMode: left.sourceMode,
      rightSourceMode: right.sourceMode,
      leftSourceDisplayName: left.sourceDisplayName,
      rightSourceDisplayName: right.sourceDisplayName,
      fieldComparisons: JSON.parse(JSON.stringify(compared.fields)),
      explanation: compared.explanation,
      groupId: pair.groupId,
      attemptNumber: 1,
      isLatest: true,
      requestedAt: now,
      completedAt: now,
      requestedById,
    };
    await prisma.bidCrossVerification.upsert({
      where: { id: pair.id },
      update: data,
      create: { id: pair.id, ...data },
    });
  }
}

async function seedDemoReviews(prisma: PrismaClient, officerId: string | null): Promise<void> {
  const now = new Date('2026-08-30T14:10:00.000Z');
  const actorId = officerId;
  const items: Array<{
    id: string;
    fingerprint: string;
    bidId: string;
    tenderId: string;
    bidderId: string;
    issueType:
      | 'evidence_missing'
      | 'cross_source_inconsistency'
      | 'review_required'
      | 'source_unavailable';
    status: 'open' | 'clarification_requested' | 'assessed' | 'closed';
    title: string;
    whyCreated: string;
    whyItMatters: string;
    inspectHint: string;
    actionHint: string;
    machineFinding: string;
    machineExplanation: string;
    mandatory: boolean;
    requirementId?: string;
    documentId?: string;
    verificationId?: string;
    crossVerificationId?: string;
    openedAt?: Date;
  }> = [
    {
      id: id('review0000001'),
      fingerprint: `requirement:${id('req000000015')}:review_required`,
      bidId: id('bid000000001'),
      tenderId: id('tender000001'),
      bidderId: id('bidder000001'),
      issueType: 'review_required',
      status: 'closed',
      title: 'Financial eligibility',
      whyCreated: 'This financial requirement is not safely machine-evaluable from the uploaded turnover statement.',
      whyItMatters: 'Average annual turnover must be assessed by a procurement officer against the tender threshold.',
      inspectHint: 'Open the financial statement, then record an officer assessment. GST ↔ MCA is consistent on this bid.',
      actionHint: 'Officer review required. Record an assessment or request clarification.',
      machineFinding: 'REVIEW_REQUIRED',
      machineExplanation: 'Financial eligibility remains an officer judgement. The machine finding stays REVIEW_REQUIRED.',
      mandatory: true,
      requirementId: id('req000000015'),
      documentId: id('doc000000006'),
      openedAt: new Date('2026-08-30T13:40:00.000Z'),
    },
    {
      id: id('review0000002'),
      fingerprint: `cross:${id('cross0000004')}:cross_source_inconsistency`,
      bidId: id('bid000000002'),
      tenderId: id('tender000001'),
      bidderId: id('bidder000003'),
      issueType: 'cross_source_inconsistency',
      status: 'open',
      title: 'GST ↔ MCA difference',
      whyCreated: 'The GST legal name differs from the MCA source record after safe normalization.',
      whyItMatters: 'The tender requires consistent bidder identity evidence across available sources.',
      inspectHint: 'View the GST certificate, GST verification, and MCA verification side by side.',
      actionHint: 'Record an assessment or request clarification. This is not a fraud finding.',
      machineFinding: 'INCONSISTENT',
      machineExplanation: 'Cross-source comparison reported a difference. The machine finding stays unchanged after officer review.',
      mandatory: true,
      crossVerificationId: id('cross0000004'),
      documentId: id('doc000000008'),
      verificationId: id('verif0000004'),
    },
    {
      id: id('review0000003'),
      fingerprint: `cross:${id('cross0000005')}:source_unavailable`,
      bidId: id('bid000000003'),
      tenderId: id('tender000001'),
      bidderId: id('bidder000007'),
      issueType: 'source_unavailable',
      status: 'open',
      title: 'GST ↔ MCA source unavailable',
      whyCreated: 'GST evidence is available, but the MCA demo source did not return a comparable record.',
      whyItMatters: 'Identity consistency cannot be established from the available source records.',
      inspectHint: 'Inspect the GST verification, MCA attempt, source mode, and retry availability. A source outage is not bidder misconduct.',
      actionHint: 'Record an assessment or request clarification only if supporting evidence is also missing.',
      machineFinding: 'INSUFFICIENT_EVIDENCE',
      machineExplanation: 'The cross-check could not compare two complete source records.',
      mandatory: true,
      crossVerificationId: id('cross0000005'),
      verificationId: id('verif0000005'),
    },
    {
      id: id('review0000004'),
      fingerprint: `requirement:${id('req000000003')}:evidence_missing`,
      bidId: id('bid000000002'),
      tenderId: id('tender000001'),
      bidderId: id('bidder000003'),
      issueType: 'evidence_missing',
      status: 'clarification_requested',
      title: 'Udyam / MSME evidence if claimed',
      whyCreated: 'No Udyam registration evidence is associated with this bid.',
      whyItMatters: 'If MSME purchase preference is claimed, current Udyam evidence should be available for officer inspection.',
      inspectHint: 'Open the requirement and Documents tab to see what was uploaded.',
      actionHint: 'Request clarification or record an assessment. Do not treat this as an automatic fail.',
      machineFinding: 'EVIDENCE_MISSING',
      machineExplanation: 'No relevant Udyam evidence is associated with this requirement.',
      mandatory: false,
      requirementId: id('req000000003'),
      openedAt: new Date('2026-08-30T13:50:00.000Z'),
    },
    {
      id: id('review0000005'),
      fingerprint: `requirement:${id('req000000014')}:review_required`,
      bidId: id('bid000000001'),
      tenderId: id('tender000001'),
      bidderId: id('bidder000001'),
      issueType: 'review_required',
      status: 'closed',
      title: 'Technical capability statement',
      whyCreated: 'Technical experience evidence is present but not safely machine-evaluable.',
      whyItMatters: 'Similar valve supply experience must be judged by a procurement officer.',
      inspectHint: 'Open the experience certificate and the technical requirement, then request supporting project completion evidence if needed.',
      actionHint: 'Officer review required. Request clarification or record an assessment.',
      machineFinding: 'REVIEW_REQUIRED',
      machineExplanation: 'Qualitative technical eligibility is not automatically evaluated.',
      mandatory: true,
      requirementId: id('req000000014'),
      documentId: id('doc000000005'),
      openedAt: new Date('2026-08-30T13:55:00.000Z'),
    },
  ];

  for (const item of items) {
    const data = {
      fingerprint: item.fingerprint,
      bidSubmissionId: item.bidId,
      tenderId: item.tenderId,
      bidderId: item.bidderId,
      issueType: item.issueType,
      status: item.status,
      title: item.title,
      whyCreated: item.whyCreated,
      whyItMatters: item.whyItMatters,
      inspectHint: item.inspectHint,
      actionHint: item.actionHint,
      machineFinding: item.machineFinding,
      machineExplanation: item.machineExplanation,
      mandatory: item.mandatory,
      requirementId: item.requirementId ?? null,
      documentId: item.documentId ?? null,
      verificationId: item.verificationId ?? null,
      crossVerificationId: item.crossVerificationId ?? null,
      openedAt: item.openedAt ?? null,
      openedById: item.openedAt && actorId ? actorId : null,
      closedAt: item.status === 'closed' ? now : null,
      closedById: item.status === 'closed' && actorId ? actorId : null,
    };
    await prisma.bidReviewItem.upsert({
      where: { id: item.id },
      update: data,
      create: { id: item.id, ...data },
    });
  }

  if (actorId) {
    await prisma.reviewAssessment.deleteMany({
      where: { reviewItemId: { in: items.map((item) => item.id) } },
    });
    await prisma.reviewClarification.deleteMany({
      where: { reviewItemId: { in: items.map((item) => item.id) } },
    });

    await prisma.reviewAssessment.create({
      data: {
        id: id('assess0000001'),
        reviewItemId: id('review0000001'),
        assessment: 'evidence_sufficient',
        note: 'DEMO / SYNTHETIC officer note. The uploaded turnover statement covers three financial years and is sufficient for officer inspection. This is not a procurement award.',
        attemptNumber: 1,
        isLatest: true,
        assessedById: actorId,
        assessedAt: now,
      },
    });

    await prisma.reviewAssessment.create({
      data: {
        id: id('assess0000002'),
        reviewItemId: id('review0000005'),
        assessment: 'evidence_sufficient',
        note: 'DEMO / SYNTHETIC officer note. The technical capability statement and supporting project evidence are sufficient for this inspection. This is not a procurement award.',
        attemptNumber: 1,
        isLatest: true,
        assessedById: actorId,
        assessedAt: now,
      },
    });

    await prisma.reviewClarification.create({
      data: {
        id: id('clarify000001'),
        reviewItemId: id('review0000004'),
        bidSubmissionId: id('bid000000002'),
        message: 'DEMO / SYNTHETIC request. Please provide the current Udyam Registration Certificate associated with the bidding organisation, if MSME preference is claimed.',
        status: 'requested',
        requestedById: actorId,
        requestedAt: now,
        synthetic: true,
      },
    });

    await prisma.reviewClarification.create({
      data: {
        id: id('clarify000002'),
        reviewItemId: id('review0000005'),
        bidSubmissionId: id('bid000000001'),
        message: 'DEMO / SYNTHETIC request. Please provide supporting project completion evidence for the similar valve supply assignments listed in the technical capability statement.',
        status: 'responded',
        requestedById: actorId,
        requestedAt: now,
        response:
          'DEMO / SYNTHETIC response. Project completion records for the listed valve supply assignments are included in the technical capability statement. This does not represent a real bidder message.',
        respondedById: actorId,
        respondedAt: new Date('2026-08-30T14:10:00.000Z'),
        synthetic: true,
      },
    });

    await prisma.reviewClarification.create({
      data: {
        id: id('clarify000003'),
        reviewItemId: id('review0000001'),
        bidSubmissionId: id('bid000000001'),
        message: 'DEMO / SYNTHETIC request. Please confirm that the turnover figures cover the last three completed financial years.',
        status: 'responded',
        requestedById: actorId,
        requestedAt: new Date('2026-08-30T13:42:00.000Z'),
        response:
          'DEMO / SYNTHETIC response. Turnover figures for FY 2023-24, 2024-25 and 2025-26 are included in the uploaded statement. This does not represent a real bidder message.',
        respondedById: actorId,
        respondedAt: new Date('2026-08-30T13:58:00.000Z'),
        synthetic: true,
      },
    });
  }
}

async function seedDemoEvaluations(prisma: PrismaClient, actorId: string | null): Promise<void> {
  const evaluationId = id('evaluation0001');
  const startedAt = new Date('2026-08-30T16:10:00.000Z');
  await prisma.tenderEvaluation.upsert({
    where: { id: evaluationId },
    update: {
      tenderId: id('tender000001'),
      status: 'in_progress',
      startedAt,
      startedById: actorId,
    },
    create: {
      id: evaluationId,
      tenderId: id('tender000001'),
      status: 'in_progress',
      startedAt,
      startedById: actorId,
    },
  });

  if (!actorId) {
    return;
  }

  await prisma.evaluationNote.deleteMany({ where: { evaluationId } });
  await prisma.evaluationDecision.deleteMany({ where: { evaluationId } });

  await prisma.evaluationNote.create({
    data: {
      id: id('evalnote00001'),
      evaluationId,
      bidSubmissionId: null,
      note: 'DEMO / SYNTHETIC officer note. Tender requirements and available bid evidence have been opened for comparative inspection. This is not a procurement award or rejection.',
      attemptNumber: 1,
      isLatest: true,
      createdById: actorId,
      createdAt: new Date('2026-08-30T16:18:00.000Z'),
    },
  });
}

async function seedDemoNotifications(prisma: PrismaClient, officerId: string | null): Promise<void> {
  if (!officerId) {
    return;
  }
  const notices = [
    {
      id: id('notif00000001'),
      title: 'New bid submitted',
      body: 'BID-GEM2026BCPCL001-0002 was submitted. DEMO / SYNTHETIC',
      href: `/bharatbid/bids/${id('bid000000002')}`,
      entityId: id('bid000000002'),
      entityType: 'bid',
    },
    {
      id: id('notif00000002'),
      title: 'Verification issue detected',
      body: 'GST demo registry returned mismatched (DEMO SOURCE). DEMO / SYNTHETIC',
      href: `/bharatbid/bids/${id('bid000000002')}/verification`,
      entityId: id('bid000000002'),
      entityType: 'verification',
    },
    {
      id: id('notif00000003'),
      title: 'Review item created',
      body: 'GST ↔ MCA inconsistency requires officer review. DEMO / SYNTHETIC',
      href: `/bharatbid/bids/${id('bid000000002')}/review`,
      entityId: id('bid000000002'),
      entityType: 'review',
    },
    {
      id: id('notif00000004'),
      title: 'Evaluation requires attention',
      body: 'Valve tender evaluation is in progress. DEMO / SYNTHETIC — this is not an award.',
      href: `/bharatbid/evaluation/${id('tender000001')}`,
      entityId: id('evaluation0001'),
      entityType: 'evaluation',
    },
  ];
  for (const notice of notices) {
    await prisma.notification.upsert({
      where: { id: notice.id },
      update: {
        title: notice.title,
        body: notice.body,
        metadata: { href: notice.href, entityType: notice.entityType, entityId: notice.entityId, demo: true },
      },
      create: {
        id: notice.id,
        userId: officerId,
        type: 'info',
        title: notice.title,
        body: notice.body,
        category: 'system',
        priority: 'normal',
        metadata: { href: notice.href, entityType: notice.entityType, entityId: notice.entityId, demo: true },
      },
    });
  }
}

async function seedDemoActivity(prisma: PrismaClient, officerId: string | null): Promise<void> {
  if (!officerId) {
    return;
  }

  const events = [
    {
      id: id('audit00000001'),
      action: AUDIT_ACTIONS.TENDER_CREATED,
      resource: 'tender',
      resourceId: id('tender000001'),
      createdAt: new Date('2026-08-30T10:05:00.000Z'),
    },
    {
      id: id('audit00000002'),
      action: AUDIT_ACTIONS.BID_SUBMITTED,
      resource: 'bid',
      resourceId: id('bid000000001'),
      createdAt: new Date('2026-08-30T11:20:00.000Z'),
    },
    {
      id: id('audit00000003'),
      action: AUDIT_ACTIONS.VERIFICATION_COMPLETED,
      resource: 'bid',
      resourceId: id('bid000000001'),
      createdAt: new Date('2026-08-30T12:40:00.000Z'),
    },
    {
      id: id('audit00000004'),
      action: AUDIT_ACTIONS.VERIFICATION_MISMATCHED,
      resource: 'bid',
      resourceId: id('bid000000002'),
      createdAt: new Date('2026-08-30T12:42:00.000Z'),
    },
    {
      id: id('audit00000005'),
      action: AUDIT_ACTIONS.CROSS_VERIFICATION_INCONSISTENT,
      resource: 'bid',
      resourceId: id('bid000000002'),
      createdAt: new Date('2026-08-30T12:50:00.000Z'),
    },
    {
      id: id('audit00000006'),
      action: AUDIT_ACTIONS.REVIEW_ITEM_CREATED,
      resource: 'review',
      resourceId: id('review0000001'),
      createdAt: new Date('2026-08-30T13:10:00.000Z'),
    },
    {
      id: id('audit00000007'),
      action: AUDIT_ACTIONS.EVALUATION_STARTED,
      resource: 'tender',
      resourceId: id('tender000001'),
      createdAt: new Date('2026-08-30T16:10:00.000Z'),
    },
  ];

  for (const event of events) {
    await prisma.auditEvent.upsert({
      where: { id: event.id },
      update: {
        action: event.action,
        resource: event.resource,
        resourceId: event.resourceId,
        userId: officerId,
        status: 'success',
        request: { demo: true },
        createdAt: event.createdAt,
      },
      create: {
        id: event.id,
        userId: officerId,
        action: event.action,
        resource: event.resource,
        resourceId: event.resourceId,
        status: 'success',
        request: { demo: true },
        createdAt: event.createdAt,
      },
    });
  }
}

export const BHARATBID_DEMO_COUNTS = {
  tenders: 5,
  bidders: 10,
  bidSubmissions: 15,
  bidDocuments: 13,
  bidVerifications: 18,
  bidCrossVerifications: 5,
  bidReviewItems: 5,
  tenderEvaluations: 1,
  evaluationNotes: 1,
} as const;
