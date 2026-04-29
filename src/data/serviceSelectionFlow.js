import accountingBookkeepingImage from '../assets/services/accounting-bookkeeping-card.jpg'
import auditServicesImage from '../assets/services/audit-services-card.jpg'
import companyRegistrationImage from '../assets/services/company-registration-card.jpg'
import foodLicenseImage from '../assets/services/food-license-card.jpg'
import gstRegistrationReturnImage from '../assets/services/gst-registration-return-card.jpg'
import incomeTaxFilingImage from '../assets/services/income-tax-filing-card.jpg'

export const serviceSelectionFlow = [
  {
    id: 'income-tax-filing',
    name: 'Income Tax Filing',
    summary: 'Share the key tax documents needed to start return preparation and review.',
    description: 'Upload the core documents for your return so the team can begin verification and filing support.',
    cardImages: [
      {
        src: incomeTaxFilingImage,
        alt: 'Income tax filing service poster',
      },
    ],
    defaultDocumentType: 'Income Tax Filing',
    documentTypes: ['Income Tax Filing'],
    requiredDocumentsByType: {
      'Income Tax Filing': [
        'PAN Card',
        'Aadhaar Card',
        'Bank account details',
        'Mobile number',
        'Income proof',
        'Form 16 for salaried applicants',
        'Business or freelancer income records if applicable',
        'Form 26AS',
      ],
    },
  },
  {
    id: 'gst-registration-return',
    name: 'GST Registration & Return',
    summary: 'Submit the essentials for GST registration, return filing, and compliance review.',
    description: 'Provide your GST paperwork so registration or return filing can move ahead without repeated follow-ups.',
    cardImages: [
      {
        src: gstRegistrationReturnImage,
        alt: 'GST registration and return service poster',
      },
    ],
    defaultDocumentType: 'GST Registration & Return',
    documentTypes: ['GST Registration & Return'],
    requiredDocumentsByType: {
      'GST Registration & Return': [
        'PAN Card',
        'Aadhaar Card',
        'Passport size photo',
        'Business name and address',
        'Address proof such as an electricity bill or rent agreement',
        'Mobile number',
        'Email ID',
      ],
    },
  },
  {
    id: 'audit-services',
    name: 'Audit Services',
    summary: 'Upload your books, returns, and financial records for audit review.',
    description: 'Send the main statutory and financial documents needed to begin the audit process.',
    cardImages: [
      {
        src: auditServicesImage,
        alt: 'Audit services poster',
      },
    ],
    defaultDocumentType: 'Audit Services',
    documentTypes: ['Audit Services'],
    requiredDocumentsByType: {
      'Audit Services': [
        'PAN Card',
        'Aadhaar Card',
        'Business registration proof',
        'Bank statements',
        'Cash book or ledger',
        'Profit and loss statement',
        'Balance sheet',
        'GST returns',
        'Income tax return',
        'Form 26AS or AIS',
        'Sales invoices',
        'Purchase and expense bills',
        'Asset purchase bills',
        'Loan statements if any',
        'TDS details if applicable',
      ],
    },
  },
  {
    id: 'accounting-bookkeeping',
    name: 'Accounting / Bookkeeping',
    summary: 'Send monthly finance records for bookkeeping, reconciliation, and reporting.',
    description: 'Upload your day-to-day business records so bookkeeping and reporting can be organized accurately.',
    cardImages: [
      {
        src: accountingBookkeepingImage,
        alt: 'Accounting and bookkeeping service poster',
      },
    ],
    defaultDocumentType: 'Accounting / Bookkeeping',
    documentTypes: ['Accounting / Bookkeeping'],
    requiredDocumentsByType: {
      'Accounting / Bookkeeping': [
        'PAN Card',
        'Aadhaar Card',
        'Business registration proof such as GST, MSME, or incorporation papers',
        'Regular or monthly bank statements',
        'Cash book',
        'Sales invoices',
        'Purchase bills',
        'Expense bills',
        'GST details or returns',
        'Income records from all sources',
        'Payment receipts',
        'Outstanding debtors and creditors details',
        'Salary or payroll details if employees are on roll',
        'Asset details',
      ],
    },
  },
  {
    id: 'company-registration-food-license',
    name: 'Company Registration / Food License',
    summary: 'Choose the exact registration type and upload the matching setup documents.',
    description: 'Use this flow for incorporation documents or food-license paperwork, then submit the relevant file set.',
    cardImages: [
      {
        src: companyRegistrationImage,
        alt: 'Company registration service poster',
      },
      {
        src: foodLicenseImage,
        alt: 'Food license service poster',
      },
    ],
    defaultDocumentType: 'Company Registration',
    documentTypes: ['Company Registration', 'Food License'],
    requiredDocumentsByType: {
      'Company Registration': [
        'PAN Card of all directors',
        'Aadhaar Card',
        'Passport size photos',
        'Mobile number and email ID',
        'Address proof',
        'Registered office address proof',
        'Rent agreement or NOC',
        'Company name preference',
        'Business activity details',
        'Director details',
      ],
      'Food License': [
        'PAN Card of the owner or company',
        'Aadhaar Card of the owner, partners, or directors',
        'Passport size photo',
        'Mobile number and email ID',
        'Business registration proof such as GST, MSME, or incorporation certificate',
        'Shop and establishment certificate if applicable',
        'Business address proof such as electricity bill, rent agreement, or NOC',
        'Food safety management plan or basic declaration',
        'List of food products or menu',
        'Bank account details or cancelled cheque',
      ],
    },
  },
]

const serviceSelectionFlowById = new Map(serviceSelectionFlow.map((service) => [service.id, service]))

const serviceSelectionFlowByDocumentType = new Map(
  serviceSelectionFlow.flatMap((service) => service.documentTypes.map((documentType) => [documentType, service])),
)

export const documentTypeOptions = Array.from(
  new Set(serviceSelectionFlow.flatMap((service) => service.documentTypes)),
)

export function getServiceSelectionById(serviceId) {
  return serviceSelectionFlowById.get(serviceId) || null
}

export function getServiceSelectionByDocumentType(documentType) {
  return serviceSelectionFlowByDocumentType.get(documentType) || null
}
