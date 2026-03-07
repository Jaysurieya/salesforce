import dotenv from 'dotenv';

dotenv.config();

class SalesforceService {
  constructor() {
    this.instanceUrl = process.env.SALESFORCE_INSTANCE_URL;
    this.clientId = process.env.SALESFORCE_CLIENT_ID;
    this.clientSecret = process.env.SALESFORCE_CLIENT_SECRET;
    this.apiVersion = 'v59.0';

    // Token cache
    this._accessToken = null;
    this._tokenExpiry = null;
  }

  /**
   * Get a valid access token using OAuth2 client_credentials flow.
   * Caches the token and auto-refreshes when expired.
   */
  async getAccessToken() {
    const now = Date.now();

    // Return cached token if still valid (with 60-second buffer)
    if (this._accessToken && this._tokenExpiry && now < this._tokenExpiry - 60_000) {
      return this._accessToken;
    }

    console.log('🔑 Fetching new Salesforce access token...');

    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    const response = await fetch(`${this.instanceUrl}/services/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Salesforce OAuth2 error: ${err}`);
    }

    const data = await response.json();
    this._accessToken = data.access_token;
    // Salesforce tokens typically last 2 hours; store expiry as now + 2h
    this._tokenExpiry = now + 2 * 60 * 60 * 1000;

    console.log('✅ Salesforce access token obtained');
    return this._accessToken;
  }

  /**
   * Build authorization headers (fetches/refreshes token automatically).
   */
  async _headers() {
    const token = await this.getAccessToken();
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Query records using SOQL.
   */
  async queryRecords(objectName, whereClause = '', fields = ['Id'], limit = 10) {
    const headers = await this._headers();
    const fieldsStr = fields.join(', ');
    let soql = `SELECT ${fieldsStr} FROM ${objectName}`;
    if (whereClause) soql += ` WHERE ${whereClause}`;
    soql += ` LIMIT ${limit}`;

    console.log(`Executing SOQL: ${soql}`);

    const encoded = encodeURIComponent(soql);
    const url = `${this.instanceUrl}/services/data/${this.apiVersion}/query?q=${encoded}`;

    const response = await fetch(url, { headers });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`Failed to fetch ${objectName} records: ${err.message || JSON.stringify(err)}`);
    }

    const data = await response.json();
    return (data.records || []).map(({ attributes, ...rest }) => rest);
  }

  /**
   * Get a single record by ID.
   */
  async getRecordById(objectName, recordId, fields = ['Id']) {
    const headers = await this._headers();
    const fieldsStr = fields.join(', ');
    const soql = `SELECT ${fieldsStr} FROM ${objectName} WHERE Id = '${recordId}' LIMIT 1`;
    const encoded = encodeURIComponent(soql);
    const url = `${this.instanceUrl}/services/data/${this.apiVersion}/query?q=${encoded}`;

    const response = await fetch(url, { headers });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`Failed to fetch record: ${err.message || JSON.stringify(err)}`);
    }

    const data = await response.json();
    if (!data.records || data.records.length === 0) return null;
    const { attributes, ...rest } = data.records[0];
    return rest;
  }

  /**
   * Create a new record in a Salesforce object.
   * @param {string} objectName - e.g. 'Contact', 'Lead'
   * @param {Object} fields - Field values to set
   * @returns {Promise<Object>} - { id, success }
   */
  async createRecord(objectName, fields) {
    const headers = await this._headers();
    const url = `${this.instanceUrl}/services/data/${this.apiVersion}/sobjects/${objectName}`;

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(fields),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`Failed to create ${objectName}: ${JSON.stringify(err)}`);
    }

    return response.json(); // { id, success, errors }
  }

  /**
   * Update an existing record.
   * @param {string} objectName - e.g. 'Contact'
   * @param {string} recordId - Salesforce record ID
   * @param {Object} fields - Fields to update
   */
  async updateRecord(objectName, recordId, fields) {
    const headers = await this._headers();
    const url = `${this.instanceUrl}/services/data/${this.apiVersion}/sobjects/${objectName}/${recordId}`;

    const response = await fetch(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(fields),
    });

    // PATCH returns 204 No Content on success
    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`Failed to update ${objectName} ${recordId}: ${JSON.stringify(err)}`);
    }

    return { success: true, id: recordId };
  }

  /**
   * Check if connection is available (attempts to get a token).
   */
  async isConnected() {
    try {
      await this.getAccessToken();
      return true;
    } catch {
      return false;
    }
  }
}

export default new SalesforceService();
