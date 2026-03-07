/**
 * Tool Definitions for Salesforce Tools
 * Each tool has a name, description, and JSON Schema parameters
 */

export const toolDefinitions = [
  {
    name: 'getAccountRecords',
    description: 'Fetch account/company records from Salesforce. Use this when user asks about companies, organizations, or business accounts.',
    parameters: {
      type: 'object',
      properties: {
        accountId: { type: 'string', description: 'Specific account ID (optional).' },
        accountName: { type: 'string', description: 'Account name or partial name to search for.' },
        fields: {
          type: 'array', items: { type: 'string' },
          description: 'Fields to retrieve.',
          default: ['Id', 'Name', 'Industry', 'Phone', 'Website', 'BillingCity']
        },
        limit: { type: 'number', description: 'Maximum records to return.', default: 10, minimum: 1, maximum: 200 }
      },
      required: []
    }
  },
  {
    name: 'getContactRecords',
    description: 'Fetch contact/person records from Salesforce. Use this when user asks about people, contacts, or individuals.',
    parameters: {
      type: 'object',
      properties: {
        contactId: { type: 'string', description: 'Specific contact ID (optional).' },
        accountId: { type: 'string', description: 'Filter contacts by account ID.' },
        email: { type: 'string', description: 'Search by email address.' },
        lastName: { type: 'string', description: 'Last name to search for.' },
        fields: {
          type: 'array', items: { type: 'string' },
          description: 'Fields to retrieve.',
          default: ['Id', 'FirstName', 'LastName', 'Email', 'Phone', 'AccountId']
        },
        limit: { type: 'number', description: 'Maximum records to return.', default: 10, minimum: 1, maximum: 200 }
      },
      required: []
    }
  },
  {
    name: 'getOpportunityRecords',
    description: 'Fetch opportunity/sales deal records from Salesforce. Use this when user asks about deals, sales opportunities, or revenue.',
    parameters: {
      type: 'object',
      properties: {
        opportunityId: { type: 'string', description: 'Specific opportunity ID (optional).' },
        accountId: { type: 'string', description: 'Filter by account ID.' },
        stage: {
          type: 'string',
          description: 'Filter by opportunity stage.',
          enum: ['Prospecting', 'Qualification', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost']
        },
        minAmount: { type: 'number', description: 'Minimum opportunity amount.' },
        fields: {
          type: 'array', items: { type: 'string' },
          description: 'Fields to retrieve.',
          default: ['Id', 'Name', 'Amount', 'Stage', 'CloseDate', 'AccountId']
        },
        limit: { type: 'number', description: 'Maximum records to return.', default: 10, minimum: 1, maximum: 200 }
      },
      required: []
    }
  },
  {
    name: 'getLeadRecords',
    description: 'Fetch lead/prospect records from Salesforce. Use this when user asks about potential customers or leads.',
    parameters: {
      type: 'object',
      properties: {
        leadId: { type: 'string', description: 'Specific lead ID (optional).' },
        status: {
          type: 'string',
          description: 'Filter by lead status.',
          enum: ['New', 'Working - Contacted', 'Qualified', 'Unqualified']
        },
        email: { type: 'string', description: 'Search by email address.' },
        company: { type: 'string', description: 'Company name to search for.' },
        fields: {
          type: 'array', items: { type: 'string' },
          description: 'Fields to retrieve.',
          default: ['Id', 'FirstName', 'LastName', 'Company', 'Email', 'Status', 'Phone']
        },
        limit: { type: 'number', description: 'Maximum records to return.', default: 10, minimum: 1, maximum: 200 }
      },
      required: []
    }
  },
  {
    name: 'getCaseRecords',
    description: 'Fetch support case/ticket records from Salesforce. Use when user asks about support cases, tickets, or customer issues.',
    parameters: {
      type: 'object',
      properties: {
        caseId: { type: 'string', description: 'Specific case ID (optional).' },
        status: {
          type: 'string',
          description: 'Filter by case status.',
          enum: ['New', 'In Progress', 'Escalated', 'Closed']
        },
        priority: {
          type: 'string',
          description: 'Filter by priority.',
          enum: ['Low', 'Medium', 'High', 'Critical']
        },
        fields: {
          type: 'array', items: { type: 'string' },
          description: 'Fields to retrieve.',
          default: ['Id', 'CaseNumber', 'Subject', 'Status', 'Priority', 'CreatedDate']
        },
        limit: { type: 'number', description: 'Maximum records to return.', default: 10, minimum: 1, maximum: 200 }
      },
      required: []
    }
  },
  {
    name: 'createRecord',
    description: 'Create a new record in any Salesforce object (e.g. Contact, Lead, Account, Case). Use this when user wants to add or create something in Salesforce.',
    parameters: {
      type: 'object',
      properties: {
        objectName: {
          type: 'string',
          description: 'The Salesforce object type to create. E.g. "Contact", "Lead", "Account", "Case".'
        },
        fields: {
          type: 'object',
          description: 'Key-value pairs of field names and values for the new record. E.g. {"FirstName": "John", "LastName": "Doe", "Email": "john@example.com"}.'
        }
      },
      required: ['objectName', 'fields']
    }
  },
  {
    name: 'updateRecord',
    description: 'Update an existing record in Salesforce by its ID. Use this when user wants to modify, edit, or update existing data.',
    parameters: {
      type: 'object',
      properties: {
        objectName: {
          type: 'string',
          description: 'The Salesforce object type. E.g. "Contact", "Lead", "Account".'
        },
        recordId: {
          type: 'string',
          description: 'The Salesforce record ID (18-character ID) of the record to update.'
        },
        fields: {
          type: 'object',
          description: 'Key-value pairs of fields to update. E.g. {"Phone": "555-1234", "Email": "new@example.com"}.'
        }
      },
      required: ['objectName', 'recordId', 'fields']
    }
  }
];

export default toolDefinitions;
