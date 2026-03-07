import SalesforceService from '../services/salesforce.js';

/**
 * Salesforce Tools Implementation
 * Each function executes a specific Salesforce operation
 */

export async function getAccountRecords(params) {
  const { accountId, accountName, fields = ['Id', 'Name', 'Industry', 'Phone', 'Website', 'BillingCity'], limit = 10 } = params;
  try {
    if (accountId) {
      const record = await SalesforceService.getRecordById('Account', accountId, fields);
      return record ? [record] : [];
    }
    const whereClause = accountName ? `Name LIKE '%${accountName.replace(/'/g, "\\'")}%'` : '';
    return SalesforceService.queryRecords('Account', whereClause, fields, limit);
  } catch (error) {
    console.error('Error in getAccountRecords:', error.message);
    throw error;
  }
}

export async function getContactRecords(params) {
  const { contactId, accountId, email, lastName, fields = ['Id', 'FirstName', 'LastName', 'Email', 'Phone', 'AccountId'], limit = 10 } = params;
  try {
    if (contactId) {
      const record = await SalesforceService.getRecordById('Contact', contactId, fields);
      return record ? [record] : [];
    }
    const conditions = [];
    if (accountId) conditions.push(`AccountId = '${accountId}'`);
    if (email) conditions.push(`Email = '${email}'`);
    if (lastName) conditions.push(`LastName LIKE '%${lastName.replace(/'/g, "\\'")}%'`);
    return SalesforceService.queryRecords('Contact', conditions.join(' AND '), fields, limit);
  } catch (error) {
    console.error('Error in getContactRecords:', error.message);
    throw error;
  }
}

export async function getOpportunityRecords(params) {
  const { opportunityId, accountId, stage, minAmount, fields = ['Id', 'Name', 'Amount', 'Stage', 'CloseDate', 'AccountId'], limit = 10 } = params;
  try {
    if (opportunityId) {
      const record = await SalesforceService.getRecordById('Opportunity', opportunityId, fields);
      return record ? [record] : [];
    }
    const conditions = [];
    if (accountId) conditions.push(`AccountId = '${accountId}'`);
    if (stage) conditions.push(`StageName = '${stage}'`);
    if (minAmount !== undefined) conditions.push(`Amount >= ${minAmount}`);
    return SalesforceService.queryRecords('Opportunity', conditions.join(' AND '), fields, limit);
  } catch (error) {
    console.error('Error in getOpportunityRecords:', error.message);
    throw error;
  }
}

export async function getLeadRecords(params) {
  const { leadId, status, email, company, fields = ['Id', 'FirstName', 'LastName', 'Company', 'Email', 'Status', 'Phone'], limit = 10 } = params;
  try {
    if (leadId) {
      const record = await SalesforceService.getRecordById('Lead', leadId, fields);
      return record ? [record] : [];
    }
    const conditions = [];
    if (status) conditions.push(`Status = '${status}'`);
    if (email) conditions.push(`Email = '${email}'`);
    if (company) conditions.push(`Company LIKE '%${company.replace(/'/g, "\\'")}%'`);
    return SalesforceService.queryRecords('Lead', conditions.join(' AND '), fields, limit);
  } catch (error) {
    console.error('Error in getLeadRecords:', error.message);
    throw error;
  }
}

export async function getCaseRecords(params) {
  const { caseId, status, priority, fields = ['Id', 'CaseNumber', 'Subject', 'Status', 'Priority', 'CreatedDate'], limit = 10 } = params;
  try {
    if (caseId) {
      const record = await SalesforceService.getRecordById('Case', caseId, fields);
      return record ? [record] : [];
    }
    const conditions = [];
    if (status) conditions.push(`Status = '${status}'`);
    if (priority) conditions.push(`Priority = '${priority}'`);
    return SalesforceService.queryRecords('Case', conditions.join(' AND '), fields, limit);
  } catch (error) {
    console.error('Error in getCaseRecords:', error.message);
    throw error;
  }
}

/**
 * Create a new record in any Salesforce object.
 */
export async function createRecord(params) {
  const { objectName, fields } = params;
  if (!objectName || !fields) {
    throw new Error('createRecord requires objectName and fields');
  }
  try {
    const result = await SalesforceService.createRecord(objectName, fields);
    return result;
  } catch (error) {
    console.error('Error in createRecord:', error.message);
    throw error;
  }
}

/**
 * Update an existing Salesforce record.
 */
export async function updateRecord(params) {
  const { objectName, recordId, fields } = params;
  if (!objectName || !recordId || !fields) {
    throw new Error('updateRecord requires objectName, recordId, and fields');
  }
  try {
    const result = await SalesforceService.updateRecord(objectName, recordId, fields);
    return result;
  } catch (error) {
    console.error('Error in updateRecord:', error.message);
    throw error;
  }
}

const salesforceTools = {
  getAccountRecords,
  getContactRecords,
  getOpportunityRecords,
  getLeadRecords,
  getCaseRecords,
  createRecord,
  updateRecord,
};

export default salesforceTools;
