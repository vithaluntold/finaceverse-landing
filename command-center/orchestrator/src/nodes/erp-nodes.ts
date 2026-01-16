// ============================================
// ACCUTE ORCHESTRATOR - ERP Connector Nodes
// Indian ERP integrations that n8n doesn't have
// ============================================

import pino from 'pino';
import { NodeRegistry } from '../engine/node-registry';
import { ExecutionContext } from '../types/workflow';

const logger = pino({ name: 'erp-nodes' });

/**
 * Register all ERP connector nodes
 */
export function registerERPNodes(registry: NodeRegistry): void {
  
  // ==========================================
  // TALLY PRIME CONNECTOR
  // ==========================================
  registry.register({
    type: 'erp_tally',
    name: 'Tally Prime',
    description: 'Connect to Tally Prime ERP',
    category: 'erp',
    configSchema: {
      type: 'object',
      properties: {
        host: { type: 'string', title: 'Tally Host', default: 'localhost' },
        port: { type: 'number', title: 'Tally Port', default: 9000 },
        company: { type: 'string', title: 'Company Name' },
        operation: { 
          type: 'string', 
          title: 'Operation', 
          enum: [
            'get_ledgers', 'get_vouchers', 'get_stock_items', 'get_groups',
            'create_voucher', 'create_ledger', 'get_daybook', 'get_trial_balance',
            'get_balance_sheet', 'get_profit_loss', 'sync_masters', 'get_gstr1_data'
          ]
        },
        voucherType: { type: 'string', title: 'Voucher Type', enum: ['Sales', 'Purchase', 'Receipt', 'Payment', 'Journal', 'Contra'] },
        fromDate: { type: 'string', title: 'From Date' },
        toDate: { type: 'string', title: 'To Date' }
      },
      required: ['host', 'company', 'operation']
    },
    inputsSchema: [
      { name: 'data', type: 'object', required: false, description: 'Data for create operations' }
    ],
    outputsSchema: [
      { name: 'result', type: 'any', description: 'Tally response data' },
      { name: 'success', type: 'boolean' }
    ],
    execute: async (inputs, config, context) => {
      const operation = config.operation as string;
      
      logger.info({ operation, company: config.company }, 'Executing Tally operation');

      // Build TDL XML request based on operation
      let tdlRequest: string;
      
      switch (operation) {
        case 'get_ledgers':
          tdlRequest = buildLedgerRequest(config.company as string);
          break;
        case 'get_vouchers':
          tdlRequest = buildVoucherRequest(config.company as string, config.voucherType as string, config.fromDate as string, config.toDate as string);
          break;
        case 'get_daybook':
          tdlRequest = buildDaybookRequest(config.company as string, config.fromDate as string, config.toDate as string);
          break;
        case 'get_trial_balance':
          tdlRequest = buildTrialBalanceRequest(config.company as string, config.toDate as string);
          break;
        case 'get_balance_sheet':
          tdlRequest = buildBalanceSheetRequest(config.company as string, config.toDate as string);
          break;
        case 'create_voucher':
          tdlRequest = buildCreateVoucherRequest(config.company as string, inputs.data as any);
          break;
        case 'get_gstr1_data':
          tdlRequest = buildGSTR1Request(config.company as string, config.fromDate as string, config.toDate as string);
          break;
        default:
          throw new Error(`Unknown Tally operation: ${operation}`);
      }

      // Send request to Tally
      const response = await fetch(`http://${config.host}:${config.port}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/xml' },
        body: tdlRequest
      });

      if (!response.ok) {
        throw new Error(`Tally request failed: ${response.statusText}`);
      }

      const xmlResponse = await response.text();
      const parsedData = await parseTallyResponse(xmlResponse);

      return {
        result: parsedData,
        success: true,
        rawXml: xmlResponse
      };
    },
    testConnection: async (config) => {
      try {
        const response = await fetch(`http://${config.host}:${config.port}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/xml' },
          body: `<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Data</TYPE><ID>List of Companies</ID></HEADER><BODY><DESC><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT></STATICVARIABLES></DESC></BODY></ENVELOPE>`
        });
        return response.ok;
      } catch {
        return false;
      }
    }
  });

  // ==========================================
  // ZOHO BOOKS CONNECTOR
  // ==========================================
  registry.register({
    type: 'erp_zoho',
    name: 'Zoho Books',
    description: 'Connect to Zoho Books',
    category: 'erp',
    configSchema: {
      type: 'object',
      properties: {
        organizationId: { type: 'string', title: 'Organization ID' },
        operation: { 
          type: 'string', 
          title: 'Operation', 
          enum: [
            'list_invoices', 'create_invoice', 'get_invoice',
            'list_bills', 'create_bill', 'get_bill',
            'list_customers', 'create_customer',
            'list_vendors', 'create_vendor',
            'list_items', 'create_item',
            'list_chart_of_accounts', 'create_journal',
            'list_bank_transactions', 'categorize_transaction',
            'get_balance_sheet', 'get_profit_loss', 'get_trial_balance'
          ]
        },
        recordId: { type: 'string', title: 'Record ID' },
        filters: { type: 'object', title: 'Filters' }
      },
      required: ['organizationId', 'operation']
    },
    inputsSchema: [
      { name: 'data', type: 'object', required: false }
    ],
    outputsSchema: [
      { name: 'result', type: 'any' },
      { name: 'pagination', type: 'object' }
    ],
    execute: async (inputs, config, context) => {
      const baseUrl = 'https://books.zoho.in/api/v3';
      const operation = config.operation as string;
      const orgId = config.organizationId;
      
      // Get OAuth token from credentials
      const accessToken = context.credentials?.zoho_access_token || process.env.ZOHO_ACCESS_TOKEN;
      
      if (!accessToken) {
        throw new Error('Zoho access token not configured');
      }

      const headers = {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json',
        'X-com-zoho-books-organizationid': orgId as string
      };

      let url: string;
      let method = 'GET';
      let body: string | undefined;

      // Map operations to API endpoints
      switch (operation) {
        case 'list_invoices':
          url = `${baseUrl}/invoices`;
          break;
        case 'create_invoice':
          url = `${baseUrl}/invoices`;
          method = 'POST';
          body = JSON.stringify(inputs.data);
          break;
        case 'get_invoice':
          url = `${baseUrl}/invoices/${config.recordId}`;
          break;
        case 'list_bills':
          url = `${baseUrl}/bills`;
          break;
        case 'create_bill':
          url = `${baseUrl}/bills`;
          method = 'POST';
          body = JSON.stringify(inputs.data);
          break;
        case 'list_customers':
          url = `${baseUrl}/contacts?contact_type=customer`;
          break;
        case 'create_customer':
          url = `${baseUrl}/contacts`;
          method = 'POST';
          body = JSON.stringify({ ...(inputs.data as Record<string, unknown>), contact_type: 'customer' });
          break;
        case 'list_chart_of_accounts':
          url = `${baseUrl}/chartofaccounts`;
          break;
        case 'create_journal':
          url = `${baseUrl}/journals`;
          method = 'POST';
          body = JSON.stringify(inputs.data);
          break;
        case 'get_balance_sheet':
          url = `${baseUrl}/reports/balancesheet`;
          break;
        case 'get_profit_loss':
          url = `${baseUrl}/reports/profitandloss`;
          break;
        case 'get_trial_balance':
          url = `${baseUrl}/reports/trialbalance`;
          break;
        default:
          throw new Error(`Unknown Zoho operation: ${operation}`);
      }

      const response = await fetch(url, {
        method,
        headers,
        body
      });

      if (!response.ok) {
        const errorData = await response.json() as { message?: string };
        throw new Error(`Zoho API error: ${errorData.message || response.statusText}`);
      }

      const result = await response.json() as Record<string, unknown> & { page_context?: unknown };

      return {
        result: result,
        pagination: result.page_context || null
      };
    }
  });

  // ==========================================
  // SAP BUSINESS ONE (INDIA) CONNECTOR
  // ==========================================
  registry.register({
    type: 'erp_sap',
    name: 'SAP Business One',
    description: 'Connect to SAP Business One',
    category: 'erp',
    configSchema: {
      type: 'object',
      properties: {
        serviceLayerUrl: { type: 'string', title: 'Service Layer URL' },
        companyDb: { type: 'string', title: 'Company Database' },
        operation: { 
          type: 'string', 
          title: 'Operation', 
          enum: [
            'get_business_partners', 'create_business_partner',
            'get_items', 'create_item',
            'get_invoices', 'create_invoice',
            'get_purchase_orders', 'create_purchase_order',
            'get_journal_entries', 'create_journal_entry',
            'get_chart_of_accounts', 'get_gst_reports',
            'get_inventory', 'get_aging_report'
          ]
        },
        recordId: { type: 'string', title: 'Record ID' }
      },
      required: ['serviceLayerUrl', 'companyDb', 'operation']
    },
    inputsSchema: [
      { name: 'data', type: 'object', required: false }
    ],
    outputsSchema: [
      { name: 'result', type: 'any' }
    ],
    execute: async (inputs, config, context) => {
      const baseUrl = config.serviceLayerUrl as string;
      const operation = config.operation as string;
      
      // Get SAP credentials
      const sessionId = await getSAPSession(
        baseUrl,
        config.companyDb as string,
        context.credentials?.sap_username,
        context.credentials?.sap_password
      );

      const headers = {
        'Cookie': `B1SESSION=${sessionId}`,
        'Content-Type': 'application/json'
      };

      let url: string;
      let method = 'GET';
      let body: string | undefined;

      switch (operation) {
        case 'get_business_partners':
          url = `${baseUrl}/BusinessPartners`;
          break;
        case 'create_business_partner':
          url = `${baseUrl}/BusinessPartners`;
          method = 'POST';
          body = JSON.stringify(mapToSAPBusinessPartner(inputs.data as any));
          break;
        case 'get_invoices':
          url = `${baseUrl}/Invoices`;
          break;
        case 'create_invoice':
          url = `${baseUrl}/Invoices`;
          method = 'POST';
          body = JSON.stringify(mapToSAPInvoice(inputs.data as any));
          break;
        case 'get_journal_entries':
          url = `${baseUrl}/JournalEntries`;
          break;
        case 'create_journal_entry':
          url = `${baseUrl}/JournalEntries`;
          method = 'POST';
          body = JSON.stringify(mapToSAPJournalEntry(inputs.data as any));
          break;
        case 'get_chart_of_accounts':
          url = `${baseUrl}/ChartOfAccounts`;
          break;
        default:
          throw new Error(`Unknown SAP operation: ${operation}`);
      }

      const response = await fetch(url, {
        method,
        headers,
        body
      });

      if (!response.ok) {
        const errorData = await response.json() as { error?: { message?: { value?: string } } };
        throw new Error(`SAP API error: ${errorData.error?.message?.value || response.statusText}`);
      }

      return {
        result: await response.json()
      };
    }
  });

  // ==========================================
  // QUICKBOOKS ONLINE (INDIA) CONNECTOR
  // ==========================================
  registry.register({
    type: 'erp_quickbooks',
    name: 'QuickBooks Online',
    description: 'Connect to QuickBooks Online',
    category: 'erp',
    configSchema: {
      type: 'object',
      properties: {
        realmId: { type: 'string', title: 'Company ID (Realm ID)' },
        environment: { type: 'string', title: 'Environment', enum: ['sandbox', 'production'], default: 'production' },
        operation: { 
          type: 'string', 
          title: 'Operation', 
          enum: [
            'list_customers', 'create_customer', 'get_customer',
            'list_invoices', 'create_invoice', 'get_invoice',
            'list_bills', 'create_bill',
            'list_accounts', 'create_journal',
            'list_vendors', 'create_vendor',
            'get_profit_loss', 'get_balance_sheet',
            'list_payments', 'create_payment'
          ]
        },
        recordId: { type: 'string', title: 'Record ID' }
      },
      required: ['realmId', 'operation']
    },
    inputsSchema: [
      { name: 'data', type: 'object', required: false }
    ],
    outputsSchema: [
      { name: 'result', type: 'any' }
    ],
    execute: async (inputs, config, context) => {
      const baseUrl = config.environment === 'sandbox' 
        ? 'https://sandbox-quickbooks.api.intuit.com/v3/company'
        : 'https://quickbooks.api.intuit.com/v3/company';
      
      const realmId = config.realmId as string;
      const operation = config.operation as string;
      
      const accessToken = context.credentials?.quickbooks_access_token || process.env.QBO_ACCESS_TOKEN;
      
      if (!accessToken) {
        throw new Error('QuickBooks access token not configured');
      }

      const headers = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };

      let url: string;
      let method = 'GET';
      let body: string | undefined;

      switch (operation) {
        case 'list_customers':
          url = `${baseUrl}/${realmId}/query?query=select * from Customer`;
          break;
        case 'create_customer':
          url = `${baseUrl}/${realmId}/customer`;
          method = 'POST';
          body = JSON.stringify(inputs.data);
          break;
        case 'list_invoices':
          url = `${baseUrl}/${realmId}/query?query=select * from Invoice`;
          break;
        case 'create_invoice':
          url = `${baseUrl}/${realmId}/invoice`;
          method = 'POST';
          body = JSON.stringify(mapToQBOInvoice(inputs.data as any));
          break;
        case 'list_accounts':
          url = `${baseUrl}/${realmId}/query?query=select * from Account`;
          break;
        case 'create_journal':
          url = `${baseUrl}/${realmId}/journalentry`;
          method = 'POST';
          body = JSON.stringify(mapToQBOJournal(inputs.data as any));
          break;
        case 'get_profit_loss':
          url = `${baseUrl}/${realmId}/reports/ProfitAndLoss`;
          break;
        case 'get_balance_sheet':
          url = `${baseUrl}/${realmId}/reports/BalanceSheet`;
          break;
        default:
          throw new Error(`Unknown QuickBooks operation: ${operation}`);
      }

      const response = await fetch(url, {
        method,
        headers,
        body
      });

      if (!response.ok) {
        const errorData = await response.json() as { Fault?: { Error?: Array<{ Message?: string }> } };
        throw new Error(`QuickBooks API error: ${errorData.Fault?.Error?.[0]?.Message || response.statusText}`);
      }

      return {
        result: await response.json()
      };
    }
  });

  // ==========================================
  // XERO CONNECTOR
  // ==========================================
  registry.register({
    type: 'erp_xero',
    name: 'Xero',
    description: 'Connect to Xero Accounting',
    category: 'erp',
    configSchema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string', title: 'Tenant ID' },
        operation: { 
          type: 'string', 
          title: 'Operation', 
          enum: [
            'list_contacts', 'create_contact',
            'list_invoices', 'create_invoice',
            'list_bills', 'create_bill',
            'list_accounts', 'create_manual_journal',
            'list_bank_transactions', 'get_profit_loss',
            'get_balance_sheet', 'get_trial_balance'
          ]
        },
        recordId: { type: 'string', title: 'Record ID' }
      },
      required: ['tenantId', 'operation']
    },
    inputsSchema: [
      { name: 'data', type: 'object', required: false }
    ],
    outputsSchema: [
      { name: 'result', type: 'any' }
    ],
    execute: async (inputs, config, context) => {
      const baseUrl = 'https://api.xero.com/api.xro/2.0';
      const operation = config.operation as string;
      
      const accessToken = context.credentials?.xero_access_token || process.env.XERO_ACCESS_TOKEN;
      
      if (!accessToken) {
        throw new Error('Xero access token not configured');
      }

      const headers: Record<string, string> = {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'xero-tenant-id': config.tenantId as string
      };

      let url: string;
      let method = 'GET';
      let body: string | undefined;

      switch (operation) {
        case 'list_contacts':
          url = `${baseUrl}/Contacts`;
          break;
        case 'create_contact':
          url = `${baseUrl}/Contacts`;
          method = 'POST';
          body = JSON.stringify({ Contacts: [inputs.data] });
          break;
        case 'list_invoices':
          url = `${baseUrl}/Invoices`;
          break;
        case 'create_invoice':
          url = `${baseUrl}/Invoices`;
          method = 'POST';
          body = JSON.stringify({ Invoices: [mapToXeroInvoice(inputs.data as any)] });
          break;
        case 'list_accounts':
          url = `${baseUrl}/Accounts`;
          break;
        case 'create_manual_journal':
          url = `${baseUrl}/ManualJournals`;
          method = 'POST';
          body = JSON.stringify({ ManualJournals: [mapToXeroJournal(inputs.data as any)] });
          break;
        case 'get_profit_loss':
          url = `${baseUrl}/Reports/ProfitAndLoss`;
          break;
        case 'get_balance_sheet':
          url = `${baseUrl}/Reports/BalanceSheet`;
          break;
        case 'get_trial_balance':
          url = `${baseUrl}/Reports/TrialBalance`;
          break;
        default:
          throw new Error(`Unknown Xero operation: ${operation}`);
      }

      const response = await fetch(url, {
        method,
        headers,
        body
      });

      if (!response.ok) {
        const errorData = await response.json() as { Message?: string };
        throw new Error(`Xero API error: ${errorData.Message || response.statusText}`);
      }

      return {
        result: await response.json()
      };
    }
  });

  logger.info('Registered ERP connector nodes');
}

// ==========================================
// TALLY TDL BUILDERS
// ==========================================

function buildLedgerRequest(company: string): string {
  return `<ENVELOPE>
    <HEADER>
      <VERSION>1</VERSION>
      <TALLYREQUEST>Export</TALLYREQUEST>
      <TYPE>Data</TYPE>
      <ID>List of Ledgers</ID>
    </HEADER>
    <BODY>
      <DESC>
        <STATICVARIABLES>
          <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
          <SVCURRENTCOMPANY>${company}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </DESC>
    </BODY>
  </ENVELOPE>`;
}

function buildVoucherRequest(company: string, voucherType: string, fromDate: string, toDate: string): string {
  return `<ENVELOPE>
    <HEADER>
      <VERSION>1</VERSION>
      <TALLYREQUEST>Export</TALLYREQUEST>
      <TYPE>Data</TYPE>
      <ID>Daybook</ID>
    </HEADER>
    <BODY>
      <DESC>
        <STATICVARIABLES>
          <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
          <SVCURRENTCOMPANY>${company}</SVCURRENTCOMPANY>
          <SVFROMDATE>${fromDate}</SVFROMDATE>
          <SVTODATE>${toDate}</SVTODATE>
          ${voucherType ? `<VOUCHERTYPENAME>${voucherType}</VOUCHERTYPENAME>` : ''}
        </STATICVARIABLES>
      </DESC>
    </BODY>
  </ENVELOPE>`;
}

function buildDaybookRequest(company: string, fromDate: string, toDate: string): string {
  return buildVoucherRequest(company, '', fromDate, toDate);
}

function buildTrialBalanceRequest(company: string, asOnDate: string): string {
  return `<ENVELOPE>
    <HEADER>
      <VERSION>1</VERSION>
      <TALLYREQUEST>Export</TALLYREQUEST>
      <TYPE>Data</TYPE>
      <ID>Trial Balance</ID>
    </HEADER>
    <BODY>
      <DESC>
        <STATICVARIABLES>
          <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
          <SVCURRENTCOMPANY>${company}</SVCURRENTCOMPANY>
          <SVTODATE>${asOnDate}</SVTODATE>
        </STATICVARIABLES>
      </DESC>
    </BODY>
  </ENVELOPE>`;
}

function buildBalanceSheetRequest(company: string, asOnDate: string): string {
  return `<ENVELOPE>
    <HEADER>
      <VERSION>1</VERSION>
      <TALLYREQUEST>Export</TALLYREQUEST>
      <TYPE>Data</TYPE>
      <ID>Balance Sheet</ID>
    </HEADER>
    <BODY>
      <DESC>
        <STATICVARIABLES>
          <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
          <SVCURRENTCOMPANY>${company}</SVCURRENTCOMPANY>
          <SVTODATE>${asOnDate}</SVTODATE>
        </STATICVARIABLES>
      </DESC>
    </BODY>
  </ENVELOPE>`;
}

function buildCreateVoucherRequest(company: string, data: any): string {
  const lines = data.lines.map((l: any) => `
    <ALLLEDGERENTRIES.LIST>
      <LEDGERNAME>${l.ledgerName}</LEDGERNAME>
      <AMOUNT>${l.type === 'debit' ? l.amount : -l.amount}</AMOUNT>
    </ALLLEDGERENTRIES.LIST>
  `).join('');

  return `<ENVELOPE>
    <HEADER>
      <VERSION>1</VERSION>
      <TALLYREQUEST>Import</TALLYREQUEST>
      <TYPE>Data</TYPE>
      <ID>Vouchers</ID>
    </HEADER>
    <BODY>
      <DESC>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${company}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </DESC>
      <DATA>
        <TALLYMESSAGE>
          <VOUCHER>
            <DATE>${data.date.replace(/-/g, '')}</DATE>
            <VOUCHERTYPENAME>${data.voucherType}</VOUCHERTYPENAME>
            <NARRATION>${data.narration || ''}</NARRATION>
            ${lines}
          </VOUCHER>
        </TALLYMESSAGE>
      </DATA>
    </BODY>
  </ENVELOPE>`;
}

function buildGSTR1Request(company: string, fromDate: string, toDate: string): string {
  return `<ENVELOPE>
    <HEADER>
      <VERSION>1</VERSION>
      <TALLYREQUEST>Export</TALLYREQUEST>
      <TYPE>Data</TYPE>
      <ID>GSTR1 Export</ID>
    </HEADER>
    <BODY>
      <DESC>
        <STATICVARIABLES>
          <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
          <SVCURRENTCOMPANY>${company}</SVCURRENTCOMPANY>
          <SVFROMDATE>${fromDate}</SVFROMDATE>
          <SVTODATE>${toDate}</SVTODATE>
        </STATICVARIABLES>
        <TDL>
          <TDLMESSAGE>
            <REPORT NAME="GSTR1 Export"/>
          </TDLMESSAGE>
        </TDL>
      </DESC>
    </BODY>
  </ENVELOPE>`;
}

async function parseTallyResponse(xml: string): Promise<any> {
  // Simple XML parser for Tally responses
  // In production, use proper XML parser like fast-xml-parser
  const data: any = {};
  
  // Extract RESULT
  const resultMatch = xml.match(/<RESULT>([\s\S]*?)<\/RESULT>/);
  if (resultMatch) {
    data.result = resultMatch[1].trim();
  }

  // Extract LINEERROR if any
  const errorMatch = xml.match(/<LINEERROR>([\s\S]*?)<\/LINEERROR>/);
  if (errorMatch) {
    data.error = errorMatch[1].trim();
  }

  // For list responses, extract items
  const ledgerMatches = xml.matchAll(/<LEDGER NAME="([^"]+)">([\s\S]*?)<\/LEDGER>/g);
  const ledgers = [];
  for (const match of ledgerMatches) {
    const closingBalance = match[2].match(/<CLOSINGBALANCE>([\d.-]+)<\/CLOSINGBALANCE>/);
    ledgers.push({
      name: match[1],
      closingBalance: closingBalance ? parseFloat(closingBalance[1]) : 0
    });
  }
  if (ledgers.length > 0) {
    data.ledgers = ledgers;
  }

  return data;
}

// ==========================================
// SAP HELPERS
// ==========================================

async function getSAPSession(baseUrl: string, companyDb: string, username: any, password: any): Promise<string> {
  const response = await fetch(`${baseUrl}/Login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      CompanyDB: companyDb,
      UserName: username,
      Password: password
    })
  });

  if (!response.ok) {
    throw new Error('SAP authentication failed');
  }

  const result = await response.json() as { SessionId: string };
  return result.SessionId;
}

function mapToSAPBusinessPartner(data: any): any {
  return {
    CardCode: data.code,
    CardName: data.name,
    CardType: data.type === 'customer' ? 'C' : 'S',
    EmailAddress: data.email,
    Phone1: data.phone,
    BPAddresses: data.addresses?.map((a: any) => ({
      AddressName: a.name,
      Street: a.street,
      City: a.city,
      State: a.state,
      ZipCode: a.pincode,
      Country: 'IN'
    }))
  };
}

function mapToSAPInvoice(data: any): any {
  return {
    CardCode: data.customerCode,
    DocDate: data.date,
    DocDueDate: data.dueDate,
    DocumentLines: data.lines.map((l: any) => ({
      ItemCode: l.itemCode,
      Quantity: l.quantity,
      Price: l.price,
      TaxCode: l.taxCode
    }))
  };
}

function mapToSAPJournalEntry(data: any): any {
  return {
    ReferenceDate: data.date,
    Memo: data.description,
    JournalEntryLines: data.lines.map((l: any) => ({
      AccountCode: l.accountCode,
      Debit: l.type === 'debit' ? l.amount : 0,
      Credit: l.type === 'credit' ? l.amount : 0
    }))
  };
}

// ==========================================
// QUICKBOOKS HELPERS
// ==========================================

function mapToQBOInvoice(data: any): any {
  return {
    CustomerRef: { value: data.customerId },
    TxnDate: data.date,
    DueDate: data.dueDate,
    Line: data.lines.map((l: any) => ({
      DetailType: 'SalesItemLineDetail',
      Amount: l.amount,
      SalesItemLineDetail: {
        ItemRef: { value: l.itemId },
        Qty: l.quantity,
        UnitPrice: l.price
      }
    }))
  };
}

function mapToQBOJournal(data: any): any {
  return {
    TxnDate: data.date,
    Line: data.lines.map((l: any) => ({
      DetailType: 'JournalEntryLineDetail',
      Amount: l.amount,
      JournalEntryLineDetail: {
        PostingType: l.type === 'debit' ? 'Debit' : 'Credit',
        AccountRef: { value: l.accountId }
      }
    }))
  };
}

// ==========================================
// XERO HELPERS
// ==========================================

function mapToXeroInvoice(data: any): any {
  return {
    Type: 'ACCREC',
    Contact: { ContactID: data.customerId },
    Date: data.date,
    DueDate: data.dueDate,
    LineItems: data.lines.map((l: any) => ({
      Description: l.description,
      Quantity: l.quantity,
      UnitAmount: l.price,
      AccountCode: l.accountCode,
      TaxType: l.taxType
    }))
  };
}

function mapToXeroJournal(data: any): any {
  return {
    Narration: data.description,
    Date: data.date,
    JournalLines: data.lines.map((l: any) => ({
      LineAmount: l.type === 'debit' ? l.amount : -l.amount,
      AccountCode: l.accountCode,
      Description: l.description
    }))
  };
}
