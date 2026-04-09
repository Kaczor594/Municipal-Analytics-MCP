/**
 * MCP Tools Module
 *
 * Defines all available tools for querying municipal analytics databases.
 * Each tool provides a specific query capability with proper input validation.
 */

import {
  Env,
  DatabaseName,
  executeQuery,
  getTables,
  getTableColumns,
  getTableRowCount,
  getAvailableDatabases,
  buildWhereClause,
  queryAuditLog,
  isValidIdentifier,
} from './database';
import {
  getDatabaseMetadata,
  getTableMetadata,
  getColumnMetadata,
} from './metadata';

// --- Shared Helpers ---

function clampLimit(value: number, max: number): number {
  return Math.min(Math.max(1, value), max);
}

// Tool names for type safety
export type ToolName =
  | 'get_instructions'
  | 'list_databases'
  | 'list_tables'
  | 'describe_table'
  | 'get_data_dictionary'
  | 'get_recent_records'
  | 'filter_by_column'
  | 'search_records'
  | 'get_summary_stats'
  | 'query_by_date_range'
  | 'execute_query'
  | 'query_f65_financials'
  | 'query_millage_rates'
  | 'query_dashboard_metrics'
  | 'get_audit_log';

// MCP Tool definition interface
interface Tool {
  name: ToolName;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * Create and return all available tools
 */
export function createTools(): Tool[] {
  return [
    {
      name: 'get_instructions',
      description:
        'CALL THIS FIRST before any other tool. Returns essential guidance for querying municipal analytics databases: recommended workflow, table selection guide for common questions, data type warnings, and tips for accurate results.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'list_databases',
      description:
        'List all available municipal analytics databases with descriptions, municipality info, fiscal year conventions, and customer class codes.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'list_tables',
      description:
        'List all tables in a specific database. Shows table names and types.',
      inputSchema: {
        type: 'object',
        properties: {
          database: {
            type: 'string',
            enum: ['holly_silver', 'rockford', 'historical', 'cadillac', 'norton_shores', 'web_water', 'mi_f65'],
            description:
              "Database to query: 'holly_silver' (Holly Data Silver — consolidated billing, budgets, capital assets), 'rockford' (Rockford), or 'historical' (Historical Budgets)",
          },
        },
        required: ['database'],
      },
    },
    {
      name: 'describe_table',
      description:
        'Get detailed information about a table including column names, types, and row count.',
      inputSchema: {
        type: 'object',
        properties: {
          database: {
            type: 'string',
            enum: ['holly_silver', 'rockford', 'historical', 'cadillac', 'norton_shores', 'web_water', 'mi_f65'],
            description: 'Database containing the table',
          },
          table: {
            type: 'string',
            description: 'Name of the table to describe',
          },
        },
        required: ['database', 'table'],
      },
    },
    {
      name: 'get_data_dictionary',
      description:
        'Get detailed descriptions of databases, tables, and columns including what data they contain, units, and code meanings. Use this BEFORE querying to understand the data. Can return info for a whole database or a specific table.',
      inputSchema: {
        type: 'object',
        properties: {
          database: {
            type: 'string',
            enum: ['holly_silver', 'rockford', 'historical', 'cadillac', 'norton_shores', 'web_water', 'mi_f65'],
            description:
              "Database to get dictionary for: 'holly_silver' (Village of Holly, MI - consolidated billing, budgets, rates, capital assets, CIP, roads), 'rockford' (City of Rockford, MI - water/sewer rates), 'historical' (multi-year budget history)",
          },
          table: {
            type: 'string',
            description:
              'Specific table name (optional — if omitted, returns all table descriptions for the database)',
          },
        },
        required: ['database'],
      },
    },
    {
      name: 'get_recent_records',
      description:
        'Get the most recent records from a table. Useful for seeing sample data.',
      inputSchema: {
        type: 'object',
        properties: {
          database: {
            type: 'string',
            enum: ['holly_silver', 'rockford', 'historical', 'cadillac', 'norton_shores', 'web_water', 'mi_f65'],
            description: 'Database to query',
          },
          table: {
            type: 'string',
            description: 'Table name',
          },
          limit: {
            type: 'number',
            description: 'Number of records to return (default: 10, max: 100)',
          },
        },
        required: ['database', 'table'],
      },
    },
    {
      name: 'filter_by_column',
      description:
        'Filter records by one or more column values. Supports exact match and LIKE patterns (use % as wildcard).',
      inputSchema: {
        type: 'object',
        properties: {
          database: {
            type: 'string',
            enum: ['holly_silver', 'rockford', 'historical', 'cadillac', 'norton_shores', 'web_water', 'mi_f65'],
            description: 'Database to query',
          },
          table: {
            type: 'string',
            description: 'Table name',
          },
          filters: {
            type: 'object',
            description:
              'Column-value pairs to filter by. Use % for wildcards (e.g., {"name": "%Smith%"})',
          },
          limit: {
            type: 'number',
            description: 'Maximum records to return (default: 100)',
          },
        },
        required: ['database', 'table', 'filters'],
      },
    },
    {
      name: 'search_records',
      description:
        'Search for records containing a specific text value across all text columns in a table.',
      inputSchema: {
        type: 'object',
        properties: {
          database: {
            type: 'string',
            enum: ['holly_silver', 'rockford', 'historical', 'cadillac', 'norton_shores', 'web_water', 'mi_f65'],
            description: 'Database to search',
          },
          table: {
            type: 'string',
            description: 'Table to search',
          },
          search_term: {
            type: 'string',
            description: 'Text to search for (case-insensitive)',
          },
          limit: {
            type: 'number',
            description: 'Maximum records to return (default: 50)',
          },
        },
        required: ['database', 'table', 'search_term'],
      },
    },
    {
      name: 'get_summary_stats',
      description:
        'Get summary statistics for a table or specific columns (count, sum, average, min, max).',
      inputSchema: {
        type: 'object',
        properties: {
          database: {
            type: 'string',
            enum: ['holly_silver', 'rockford', 'historical', 'cadillac', 'norton_shores', 'web_water', 'mi_f65'],
            description: 'Database to query',
          },
          table: {
            type: 'string',
            description: 'Table name',
          },
          column: {
            type: 'string',
            description:
              'Numeric column to calculate statistics for (optional - if omitted, returns row count)',
          },
          group_by: {
            type: 'string',
            description: 'Column to group results by (optional)',
          },
        },
        required: ['database', 'table'],
      },
    },
    {
      name: 'query_by_date_range',
      description:
        'Query records within a date range. Specify the date column and range.',
      inputSchema: {
        type: 'object',
        properties: {
          database: {
            type: 'string',
            enum: ['holly_silver', 'rockford', 'historical', 'cadillac', 'norton_shores', 'web_water', 'mi_f65'],
            description: 'Database to query',
          },
          table: {
            type: 'string',
            description: 'Table name',
          },
          date_column: {
            type: 'string',
            description: 'Name of the date/datetime column',
          },
          start_date: {
            type: 'string',
            description: 'Start date (YYYY-MM-DD format)',
          },
          end_date: {
            type: 'string',
            description: 'End date (YYYY-MM-DD format)',
          },
          limit: {
            type: 'number',
            description: 'Maximum records to return (default: 100)',
          },
        },
        required: ['database', 'table', 'date_column', 'start_date', 'end_date'],
      },
    },
    {
      name: 'query_f65_financials',
      description:
        `Query Michigan F-65 Annual Financial Report data for ~1,455 local government units (cities, villages, townships). This database contains standardized financial data submitted annually to Michigan Department of Treasury.

IMPORTANT USAGE NOTES:
- You MUST always specify a category. Never query without filtering by category.
- The 'fund_group' column distinguishes actual vs budget figures AND different fund types. Always clarify which fund_group to use.
- By default, only 'Number' rows (actual reported values) are returned. Set include_summary_rows=true to also get 'Summary - Number' rows (derived calculations like fund balances, net changes).
- To compare budget vs actual, set compare_budget=true (only works for Revenue and Expenditure categories).

FUND_GROUP VALUES (pick the right one):
- "General Fund" — Actual general fund figures
- "General Fund Final Amended Budget" — Budgeted general fund figures
- "All Other Governmental Funds" — Non-general-fund actuals (special revenue, debt service, capital projects)
- "All Other Governmental Funds Final Amended Budget" — Budget for non-general funds
- "Component Units" — Separate legal entities (authorities, commissions)
- "Government-Wide" — Government-wide financial statement figures (accrual basis, no fund breakdown)

CATEGORY VALUES:
- "Revenue" — Taxes, licenses, intergovernmental, charges for services, fines, interest
- "Expenditure" — General government, public safety, public works, recreation, debt service
- "Balance Sheet" — Assets, liabilities, fund equity at fiscal year end
- "Other Financing" — Transfers in/out, bond proceeds, other non-operating items

DESCRIPTION EXAMPLES (use description_filter with LIKE patterns):
- Revenue: "%property tax%", "%state shared%", "%federal%", "%charges for%", "%interest%"
- Expenditure: "%police%", "%fire%", "%public works%", "%debt service%", "%capital outlay%"
- Balance Sheet: "%cash%", "%fund balance%", "%accounts payable%"

NOTE: This tool queries the f65_financial_data table (detailed line items, FY2025 only). For multi-year
trends (2010-2026) and financial health indicators (debt per capita, fund balance ratios, pension
liabilities, etc.), use execute_query on the 'dashboard_metrics' table in the mi_f65 database.
For property tax millage rates (2026, all Michigan taxing jurisdictions), use execute_query on the
'millage_rates' table in the mi_f65 database.
Example: SELECT year, analytics_desc, value FROM dashboard_metrics WHERE name LIKE '%HOLLY%' AND variable = 'general_fund_health' ORDER BY year
Example: SELECT entity_name, millage_category, millage_rate FROM millage_rates WHERE entity_name = 'Ann Arbor' AND entity_type = 'City'`,
      inputSchema: {
        type: 'object',
        properties: {
          municipality: {
            type: 'string',
            description: 'Municipality name (e.g., "Holly", "Rockford"). Uses LIKE matching so partial names work. Case-insensitive.',
          },
          category: {
            type: 'string',
            enum: ['Revenue', 'Expenditure', 'Balance Sheet', 'Other Financing'],
            description: 'REQUIRED. Financial category to query. Always specify this.',
          },
          fund_group: {
            type: 'string',
            enum: [
              'General Fund',
              'General Fund Final Amended Budget',
              'All Other Governmental Funds',
              'All Other Governmental Funds Final Amended Budget',
              'Component Units',
              'Government-Wide',
            ],
            description: 'Fund group to filter by. If omitted, returns all fund groups (be careful of double-counting between actual and budget rows).',
          },
          fiscal_year: {
            type: 'number',
            description: 'Fiscal year to filter by (e.g., 2023). If omitted, returns all available years.',
          },
          description_filter: {
            type: 'string',
            description: 'LIKE pattern to filter the description column (e.g., "%property tax%"). Case-insensitive.',
          },
          lu_nametype: {
            type: 'string',
            enum: ['City', 'Village', 'Township'],
            description: 'Filter by local unit type.',
          },
          include_summary_rows: {
            type: 'boolean',
            description: 'If true, includes "Summary - Number" rows (derived calculations like fund balances). Default: false (only "Number" rows).',
          },
          compare_budget: {
            type: 'boolean',
            description: 'If true, pivots General Fund actual vs budget side-by-side with variance. Only works for Revenue and Expenditure categories.',
          },
          limit: {
            type: 'number',
            description: 'Maximum rows to return (default: 200, max: 1000).',
          },
        },
        required: ['category'],
      },
    },
    {
      name: 'query_millage_rates',
      description:
        `Query Michigan property tax millage rates (2024 and 2026, ~28K rows from 6 source sheets per year). Covers ALL taxing jurisdictions statewide:

ENTITY TYPES (sheet_source → entity_type):
- "Local Unit" → County, City, Township, Village — individual levy purposes (POLICE, FIRE, LIBRARY, ROADS, PARKS/REC, etc.)
- "School" → School District — 6 rate types per district: HoldHarmless, NonHomestead, Debt, SinkingFund, CommPers, Recreational
- "ISD" → ISD (Intermediate School District) — 5 rate types: Allocated, Vocational, SpecialEd, Enhancement, Debt
- "Community College" → Community College — 2 rate types: Operating, Debt
- "Authority" → Authority — libraries, transit, DDA, fire, EMS authorities — Operating + Debt rates
- "Special Assessment" → Special Assessment — fire, EMS, police, roads, drains, etc.

MILLAGE RATE: Expressed in mills (dollars per $1,000 of taxable value). 18.0 mills = $18 per $1,000.

Use this tool for any property tax, millage, or levy questions. You can filter by county, entity name, entity type, sheet source, millage category, or tax year. Omit tax_year to get both years (useful for year-over-year comparisons).`,
      inputSchema: {
        type: 'object',
        properties: {
          tax_year: {
            type: 'number',
            enum: [2024, 2026],
            description: 'Filter by tax year. Available: 2024, 2026. Omit to return both years.',
          },
          county: {
            type: 'string',
            description: 'County name filter (uses LIKE matching, case-insensitive). E.g., "Washtenaw", "Oakland".',
          },
          entity_name: {
            type: 'string',
            description: 'Entity name filter (uses LIKE matching, case-insensitive). E.g., "Ann Arbor", "Holly".',
          },
          entity_type: {
            type: 'string',
            enum: ['County', 'City', 'Township', 'Village', 'School District', 'ISD', 'Community College', 'Authority', 'Special Assessment'],
            description: 'Filter by entity type.',
          },
          sheet_source: {
            type: 'string',
            enum: ['Local Unit', 'School', 'ISD', 'Community College', 'Authority', 'Special Assessment'],
            description: 'Filter by source data sheet. "Local Unit" = counties/cities/townships/villages. Other values correspond to the entity type.',
          },
          millage_category: {
            type: 'string',
            description: 'Filter by levy purpose (uses LIKE matching). E.g., "POLICE", "FIRE", "NonHomestead", "Operating", "Debt".',
          },
          aggregate_by: {
            type: 'string',
            enum: ['county', 'entity', 'entity_type', 'sheet_source', 'category'],
            description: 'If set, returns SUM and COUNT of millage rates grouped by the specified dimension.',
          },
          limit: {
            type: 'number',
            description: 'Maximum rows to return (default: 200, max: 1000).',
          },
        },
      },
    },
    {
      name: 'query_dashboard_metrics',
      description:
        'Query Michigan Community Financial Dashboard metrics (459K rows, 2010–2026). 21 pre-computed financial health indicators for ~1,455 local government units. Use for financial health comparisons, trend analysis, and benchmarking across municipalities.',
      inputSchema: {
        type: 'object',
        properties: {
          variable: {
            type: 'string',
            enum: [
              'general_fund_ratio', 'general_fund_health', 'general_fund_cash_Ratio',
              'general_fund_unrestricted_balance', 'total_general_fund_revenue',
              'total_general_fund_revenues', 'total_general_fund_expenditures',
              'revenue_surplus', 'liquidity_ratio', 'governmental_net_position_ratio',
              'debt_health', 'debt_long_term', 'debt_service', 'debt_taxable_value',
              'long_term_debt_revenue', 'pension_health', 'unfunded_pension_liability',
              'property_tax_health', 'total_taxable_value', 'population', 'extraordinary',
            ],
            description:
              'Financial indicator to query. General fund: general_fund_ratio (fund balance / expenditures), general_fund_health (fund balance per capita), general_fund_cash_Ratio, liquidity_ratio, revenue_surplus. Debt: debt_health, debt_long_term, debt_service, debt_taxable_value, long_term_debt_revenue. Pension: pension_health, unfunded_pension_liability. Property tax: property_tax_health, total_taxable_value. Other: population, extraordinary, governmental_net_position_ratio.',
          },
          municipality: {
            type: 'string',
            description: 'Municipality name filter (LIKE matching, case-insensitive). Maps to the "name" column. E.g., "Holly", "Cadillac", "Ann Arbor".',
          },
          entity_type: {
            type: 'string',
            enum: ['CITY', 'COUNTY', 'TOWNSHIP', 'VILLAGE', 'ISD District', 'LEA District'],
            description: 'Filter by entity type.',
          },
          county: {
            type: 'string',
            description: 'County name filter (LIKE matching, case-insensitive). E.g., "Oakland", "Wexford".',
          },
          year: {
            type: 'number',
            description: 'Single year filter (2010–2026). Use year_start/year_end for ranges.',
          },
          year_start: {
            type: 'number',
            description: 'Start of year range (inclusive). Use with year_end for trend queries.',
          },
          year_end: {
            type: 'number',
            description: 'End of year range (inclusive). Use with year_start for trend queries.',
          },
          aggregate_by: {
            type: 'string',
            enum: ['county', 'entity_type', 'year'],
            description: 'If set, returns AVG/MIN/MAX/COUNT of the metric grouped by the specified dimension.',
          },
          limit: {
            type: 'number',
            description: 'Maximum rows to return (default: 200, max: 1000).',
          },
        },
      },
    },
    {
      name: 'execute_query',
      description:
        'Execute a custom read-only SQL SELECT query. For advanced users who need specific queries not covered by other tools.',
      inputSchema: {
        type: 'object',
        properties: {
          database: {
            type: 'string',
            enum: ['holly_silver', 'rockford', 'historical', 'cadillac', 'norton_shores', 'web_water', 'mi_f65'],
            description: 'Database to query',
          },
          query: {
            type: 'string',
            description:
              'SQL SELECT query to execute. Must be read-only (no INSERT, UPDATE, DELETE, etc.)',
          },
        },
        required: ['database', 'query'],
      },
    },
    {
      name: 'get_audit_log',
      description:
        'View the query audit log showing all tool calls made to this server. Admin tool for monitoring usage. Filter by date range or tool name.',
      inputSchema: {
        type: 'object',
        properties: {
          start_date: {
            type: 'string',
            description: 'Filter logs from this date (YYYY-MM-DD format, optional)',
          },
          end_date: {
            type: 'string',
            description: 'Filter logs until this date (YYYY-MM-DD format, optional)',
          },
          tool_name: {
            type: 'string',
            description: 'Filter by specific tool name (optional)',
          },
          limit: {
            type: 'number',
            description: 'Maximum records to return (default: 100)',
          },
        },
      },
    },
  ];
}

/**
 * Handle tool execution
 */
export async function handleToolCall(
  name: ToolName,
  args: Record<string, unknown>,
  env: Env
): Promise<unknown> {
  switch (name) {
    case 'get_instructions':
      return handleGetInstructions();

    case 'list_databases':
      return handleListDatabases();

    case 'list_tables':
      return handleListTables(args.database as DatabaseName, env);

    case 'describe_table':
      return handleDescribeTable(
        args.database as DatabaseName,
        args.table as string,
        env
      );

    case 'get_data_dictionary':
      return handleGetDataDictionary(
        args.database as DatabaseName,
        args.table as string | undefined
      );

    case 'get_recent_records':
      return handleGetRecentRecords(
        args.database as DatabaseName,
        args.table as string,
        (args.limit as number) || 10,
        env
      );

    case 'filter_by_column':
      return handleFilterByColumn(
        args.database as DatabaseName,
        args.table as string,
        args.filters as Record<string, unknown>,
        (args.limit as number) || 100,
        env
      );

    case 'search_records':
      return handleSearchRecords(
        args.database as DatabaseName,
        args.table as string,
        args.search_term as string,
        (args.limit as number) || 50,
        env
      );

    case 'get_summary_stats':
      return handleGetSummaryStats(
        args.database as DatabaseName,
        args.table as string,
        args.column as string | undefined,
        args.group_by as string | undefined,
        env
      );

    case 'query_by_date_range':
      return handleQueryByDateRange(
        args.database as DatabaseName,
        args.table as string,
        args.date_column as string,
        args.start_date as string,
        args.end_date as string,
        (args.limit as number) || 100,
        env
      );

    case 'query_f65_financials':
      return handleQueryF65Financials(args, env);

    case 'query_millage_rates':
      return handleQueryMillageRates(args, env);

    case 'query_dashboard_metrics':
      return handleQueryDashboardMetrics(args, env);

    case 'execute_query':
      return handleExecuteQuery(
        args.database as DatabaseName,
        args.query as string,
        env
      );

    case 'get_audit_log':
      return queryAuditLog(env, {
        startDate: args.start_date as string | undefined,
        endDate: args.end_date as string | undefined,
        toolName: args.tool_name as string | undefined,
        limit: (args.limit as number) || 100,
      });

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// Tool handlers

function handleGetInstructions() {
  return {
    overview:
      'You have access to municipal analytics databases for Michigan water/sewer utilities. Follow this workflow for accurate results.',
    workflow: [
      '1. Call get_data_dictionary with the relevant database to understand table contents and column meanings before writing any queries.',
      '2. Choose the right table using the guide below.',
      '3. Use execute_query for complex analysis, or the simpler tools (filter_by_column, get_summary_stats) for basic lookups.',
    ],
    databases: {
      holly_silver:
        'Village of Holly, MI — consolidated query-ready data: billing history (129K rows), multi-year budgets (FY2021-2026), rate schedules, capital assets, water production, CIP plan, road conditions/costs, meter data.',
      rockford:
        'City of Rockford, MI — water/sewer rate study with billing history, rate schedules, class/meter summaries.',
      historical:
        'Multi-year historical budget data (2004–2026) for Michigan municipalities including Lexington.',
      cadillac:
        'City of Cadillac, MI — municipal financial and utility data.',
      norton_shores:
        'City of Norton Shores, MI — water/sewer/irrigation billing history (FY2022-25). history_register_data has all charge types (476K rows); water_billing has commodity charges only.',
      web_water:
        'WEB Water — detailed billing distribution data with meter reads, charges, usage/base charge splits, and rate codes (FY2024).',
      mi_f65:
        'Michigan F-65 Annual Financial Reports — standardized financial data for ~1,455 Michigan local government units (cities, villages, townships). Three tables: f65_financial_data (detailed line items, FY2025), dashboard_metrics (21 financial health indicators, 2010-2026, 459K rows), and millage_rates (property tax millage rates for all Michigan taxing jurisdictions, 2024 & 2026, 28K rows). Use query_f65_financials for F-65 line items, query_dashboard_metrics for financial health indicators, and query_millage_rates for tax rates.',
    },
    tableSelectionGuide: {
      'Billing/revenue questions (Holly)': {
        primaryTable: 'history_register_data (holly_silver)',
        description:
          'Detailed billing transactions (129K rows). Use for: total revenue, revenue by class/service/customer, billing trends.',
        keyColumns: 'bill_item_name (service type), class (RE/CO/SC/IN), amount (USD), billed_usage, government_type, simple_status',
      },
      'Billing/revenue questions (Rockford)': {
        primaryTable: 'rockford_hrd',
        description:
          'Combined billing with meter sizes. Use for: revenue analysis by class, meter size, or rate code.',
        keyColumns: 'rate (service description), class, amount, billed_usage, meter_size, fye (fiscal year)',
      },
      'Pre-computed summaries (Rockford)': {
        tables: [
          'fye_YYYY_water_class_summary / fye_YYYY_sewer_class_summary — by class per fiscal year',
          'fye_YYYY_water_meter_summary / fye_YYYY_sewer_meter_summary — by meter size per fiscal year',
        ],
        note: 'Rockford has pre-computed summary tables. For Holly, query history_register_data directly with GROUP BY.',
      },
      'Budget questions (Holly)': {
        primaryTable: 'budget_final (holly_silver)',
        description:
          'Multi-year consolidated budget (FY2021–2026) with GL account detail. All funds combined into one table.',
        keyColumns: 'gl_number, description, amount_2021 through amount_2026, fund_number, department_number, object_number, account_type (Revenue/Expenditure)',
      },
      'Budget questions (Historical)': {
        primaryTable: 'historical_budget_data',
        description:
          'Budget data from 2004–2026 across municipalities. Filter by model_name for specific municipality/version.',
        keyColumns: 'model_name, fund_name, description, amount_2004 through amount_2026, Assumption',
      },
      'Rate schedules': {
        holly_silver: 'rate_schedule — water/sewer rate tiers by fiscal year',
        rockford: 'rate_schedule_history — historical rates FY2012–2026 by meter size and service type',
      },
      'Customer/account lookups': {
        holly_silver: 'meter_sizes_long — normalized meter data (one row per meter per account). history_register_data — billing by account.',
        rockford: 'rockford_hrd — billing by account with meter size.',
      },
      'Capital assets (Holly)': {
        table: 'capital_assets (holly_silver)',
        description: 'Fixed asset register with cost, depreciation, and net book value.',
      },
      'Capital improvement plan (Holly)': {
        table: 'capital_improvement_plan (holly_silver)',
        description: 'Consolidated CIP with budget timelines and project scoring criteria. source=budget_timeline for fiscal year cost breakdowns, source=project_scoring for priority/criteria.',
      },
      'Road conditions and costs (Holly)': {
        tables: 'road_segment_conditions (96 segments with ratings/RSL), road_improvement_costs (273 line-item costs). Both in holly_silver. Linked by segment_name.',
      },
      'Water production (Holly)': {
        table: 'water_production (holly_silver)',
        description: 'Unified daily water production from wells, FY2020-21 through FY2024-25. Use fiscal_year or fye columns to filter by year.',
      },
      'Property tax millage rates (Statewide)': {
        primaryTable: 'millage_rates (in mi_f65 database)',
        description:
          'Michigan property tax millage rates (2024 & 2026) — ~28K rows covering every taxing jurisdiction statewide. Includes 6 entity types from 6 separate source sheets: Local Units (counties, cities, townships, villages), School Districts (6 rate types: HoldHarmless, NonHomestead, Debt, SinkingFund, CommPers, Recreational), ISDs (5 rate types), Community Colleges (Operating + Debt), Authorities (libraries, transit, DDA, fire, EMS), and Special Assessments. Use query_millage_rates for guided queries, or execute_query on the mi_f65 database for custom SQL.',
        keyColumns: 'entity_name, entity_type, county_name, millage_category, millage_rate (mills), sheet_source',
        exampleQueries: [
          "All levies for a city: query_millage_rates with entity_name='Ann Arbor'",
          "Total millage by county: execute_query with GROUP BY county_name",
          "School district rates: query_millage_rates with sheet_source='School'",
          "Compare authority levies: query_millage_rates with sheet_source='Authority'",
        ],
      },
      'Michigan municipal financial data (Statewide)': {
        primaryTable: 'dashboard_metrics, f65_financial_data, millage_rates (all in mi_f65 database)',
        description:
          'Statewide financial data for ~1,455 Michigan LGUs. Use query_dashboard_metrics for financial health indicators (21 metrics, 2010-2026), query_f65_financials for F-65 line items (FY2025), and query_millage_rates for tax rates (2024 & 2026).',
        keyColumns: 'name/entity_name (municipality), variable (metric type), value (metric amount)',
      },
    },
    importantWarnings: [
      'NUMERIC DATA: Most numeric columns (amount, billed_usage, billed_units, budget amounts) are now stored as REAL. You can use SUM/AVG directly without CAST. However, the rate_schedule_history table (Rockford) and historical_budget_data amount columns may still be TEXT — use CAST(column AS REAL) if aggregation returns unexpected results.',
      'FISCAL YEARS: Holly and Rockford use July 1 – June 30 fiscal years. "FY2025-26" = July 2025 to June 2026.',
      'CUSTOMER CLASSES: Holly uses codes (RE=Residential, CO=Commercial, SC=Special Contract, IN=Industrial). Rockford uses full names (Residential, Commercial, Industrial).',
      'NULL VALUES: Some columns have NULL or empty values. Use COALESCE or IS NOT NULL filters when aggregating.',
    ],
    tips: [
      'Use pre-computed summary tables when available — they are faster and already aggregated correctly.',
      'When querying history_register_data, filter by bill_item_name to isolate water vs sewer charges.',
      'For year-over-year comparisons, budget_final (holly_silver) has amounts for FY2021–2026 in a single row per GL account.',
      'Call get_data_dictionary with a specific table name to see detailed column descriptions before writing complex queries.',
    ],
  };
}

function handleListDatabases() {
  const databases = getAvailableDatabases();
  return {
    databases: databases.map((db) => {
      const meta = getDatabaseMetadata(db.name);
      return {
        name: db.name,
        displayName: db.displayName,
        municipality: meta?.municipality,
        state: meta?.state,
        description: meta?.description || db.displayName,
        fiscalYearConvention: meta?.fiscalYearConvention,
        customerClassCodes: meta?.customerClassCodes,
      };
    }),
    usage:
      'Use get_data_dictionary to understand what tables and columns contain before querying. Use list_tables to see all table names.',
  };
}

function handleGetDataDictionary(
  dbName: DatabaseName,
  tableName?: string
) {
  const meta = getDatabaseMetadata(dbName);
  if (!meta) {
    return { success: false, error: `No metadata found for database: ${dbName}` };
  }

  if (tableName) {
    const tableMeta = getTableMetadata(dbName, tableName);
    if (!tableMeta) {
      return {
        success: false,
        error: `No metadata found for table: ${tableName}. Use list_tables to see available tables.`,
      };
    }
    return {
      database: dbName,
      municipality: meta.municipality,
      fiscalYearConvention: meta.fiscalYearConvention,
      currency: meta.currency,
      customerClassCodes: meta.customerClassCodes,
      table: tableName,
      tableDescription: tableMeta.description,
      columns: tableMeta.columns || {},
    };
  }

  // Return all table descriptions for the database
  const tables: Record<string, string> = {};
  for (const [name, info] of Object.entries(meta.tables)) {
    tables[name] = info.description;
  }

  return {
    database: dbName,
    municipality: meta.municipality,
    state: meta.state,
    description: meta.description,
    fiscalYearConvention: meta.fiscalYearConvention,
    currency: meta.currency,
    customerClassCodes: meta.customerClassCodes,
    tables,
  };
}

async function handleListTables(dbName: DatabaseName, env: Env) {
  const tables = await getTables(env, dbName);
  const meta = getDatabaseMetadata(dbName);

  const enrichedTables = tables.map((t: { name: string; type: string }) => {
    const tableMeta = meta?.tables[t.name];
    return {
      ...t,
      description: tableMeta?.description || null,
    };
  });

  return {
    database: dbName,
    municipality: meta?.municipality,
    tableCount: tables.length,
    tables: enrichedTables,
    hint: 'Use get_data_dictionary for detailed column descriptions, or describe_table for column names and types.',
  };
}

async function handleDescribeTable(
  dbName: DatabaseName,
  tableName: string,
  env: Env
) {
  const columns = await getTableColumns(env, dbName, tableName);
  const rowCount = await getTableRowCount(env, dbName, tableName);
  const tableMeta = getTableMetadata(dbName, tableName);

  return {
    database: dbName,
    table: tableName,
    tableDescription: tableMeta?.description || null,
    rowCount,
    columnCount: columns.length,
    columns: columns.map((col) => {
      const colMeta = getColumnMetadata(dbName, tableName, col.name);
      return {
        name: col.name,
        displayName: colMeta?.displayName || null,
        type: col.type,
        description: colMeta?.description || null,
        unit: colMeta?.unit || null,
        knownValues: colMeta?.knownValues || null,
        nullable: col.notnull === 0,
        primaryKey: col.pk === 1,
        defaultValue: col.dflt_value,
      };
    }),
  };
}

async function handleGetRecentRecords(
  dbName: DatabaseName,
  tableName: string,
  limit: number,
  env: Env
) {
  // Validate and cap limit
  const safeLimit = clampLimit(limit, 100);

  // Validate table name
  if (!isValidIdentifier(tableName)) {
    throw new Error('Invalid table name');
  }

  const query = `SELECT * FROM "${tableName}" LIMIT ${safeLimit}`;
  return executeQuery(env, dbName, query);
}

async function handleFilterByColumn(
  dbName: DatabaseName,
  tableName: string,
  filters: Record<string, unknown>,
  limit: number,
  env: Env
) {
  // Validate table name
  if (!isValidIdentifier(tableName)) {
    throw new Error('Invalid table name');
  }

  const safeLimit = clampLimit(limit, 500);
  const { clause, params } = buildWhereClause(filters);

  const query = `SELECT * FROM "${tableName}" ${clause} LIMIT ${safeLimit}`;
  return executeQuery(env, dbName, query, params);
}

async function handleSearchRecords(
  dbName: DatabaseName,
  tableName: string,
  searchTerm: string,
  limit: number,
  env: Env
) {
  // Validate table name
  if (!isValidIdentifier(tableName)) {
    throw new Error('Invalid table name');
  }

  // Get text columns to search
  const columns = await getTableColumns(env, dbName, tableName);
  const textColumns = columns.filter(
    (col) =>
      col.type.toUpperCase().includes('TEXT') ||
      col.type.toUpperCase().includes('VARCHAR') ||
      col.type.toUpperCase().includes('CHAR')
  );

  if (textColumns.length === 0) {
    return {
      success: false,
      error: 'No text columns found in table to search',
    };
  }

  // Build OR conditions for each text column
  const conditions = textColumns.map(
    (col) => `"${col.name}" LIKE ? COLLATE NOCASE`
  );
  const params = textColumns.map(() => `%${searchTerm}%`);

  const safeLimit = clampLimit(limit, 200);
  const query = `SELECT * FROM "${tableName}" WHERE ${conditions.join(' OR ')} LIMIT ${safeLimit}`;

  return executeQuery(env, dbName, query, params);
}

async function handleGetSummaryStats(
  dbName: DatabaseName,
  tableName: string,
  column: string | undefined,
  groupBy: string | undefined,
  env: Env
) {
  // Validate table name
  if (!isValidIdentifier(tableName)) {
    throw new Error('Invalid table name');
  }

  let query: string;

  if (column) {
    // Validate column name
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(column)) {
      throw new Error('Invalid column name');
    }

    if (groupBy) {
      // Validate group by column
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(groupBy)) {
        throw new Error('Invalid group by column name');
      }

      query = `
        SELECT
          "${groupBy}" as group_value,
          COUNT(*) as count,
          SUM("${column}") as sum,
          AVG("${column}") as average,
          MIN("${column}") as min,
          MAX("${column}") as max
        FROM "${tableName}"
        GROUP BY "${groupBy}"
        ORDER BY count DESC
        LIMIT 50
      `;
    } else {
      query = `
        SELECT
          COUNT(*) as count,
          SUM("${column}") as sum,
          AVG("${column}") as average,
          MIN("${column}") as min,
          MAX("${column}") as max
        FROM "${tableName}"
      `;
    }
  } else {
    // Just return count
    query = `SELECT COUNT(*) as total_rows FROM "${tableName}"`;
  }

  return executeQuery(env, dbName, query);
}

async function handleQueryByDateRange(
  dbName: DatabaseName,
  tableName: string,
  dateColumn: string,
  startDate: string,
  endDate: string,
  limit: number,
  env: Env
) {
  // Validate table and column names
  if (!isValidIdentifier(tableName)) {
    throw new Error('Invalid table name');
  }
  if (!isValidIdentifier(dateColumn)) {
    throw new Error('Invalid column name');
  }

  // Validate date format (basic check)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
    throw new Error('Invalid date format. Use YYYY-MM-DD');
  }

  const safeLimit = clampLimit(limit, 500);

  const query = `
    SELECT * FROM "${tableName}"
    WHERE "${dateColumn}" >= ? AND "${dateColumn}" <= ?
    ORDER BY "${dateColumn}" DESC
    LIMIT ${safeLimit}
  `;

  return executeQuery(env, dbName, query, [startDate, endDate]);
}

async function handleQueryF65Financials(
  args: Record<string, unknown>,
  env: Env
) {
  const category = args.category as string;
  const whereClauses: string[] = ['category = ?'];
  const params: unknown[] = [category];

  // Notes filter: default to only 'Number' rows
  if (args.include_summary_rows) {
    whereClauses.push("notes IN ('Number', 'Summary - Number')");
  } else {
    whereClauses.push("notes = 'Number'");
  }

  // Municipality filter
  if (args.municipality) {
    whereClauses.push('lu_name LIKE ? COLLATE NOCASE');
    params.push(`%${args.municipality}%`);
  }

  // Fund group filter
  if (args.fund_group) {
    whereClauses.push('fund_group = ?');
    params.push(args.fund_group);
  }

  // Fiscal year filter
  if (args.fiscal_year) {
    whereClauses.push('fy = ?');
    params.push(args.fiscal_year);
  }

  // Description filter
  if (args.description_filter) {
    whereClauses.push('description LIKE ? COLLATE NOCASE');
    params.push(args.description_filter);
  }

  // Local unit type filter
  if (args.lu_nametype) {
    whereClauses.push('lu_nametype = ?');
    params.push(args.lu_nametype);
  }

  const limit = clampLimit((args.limit as number) || 200, 1000);
  const whereSql = whereClauses.join(' AND ');

  // Budget vs actual comparison pivot
  if (args.compare_budget && (category === 'Revenue' || category === 'Expenditure')) {
    const pivotQuery = `
      SELECT lu_name, lu_nametype, fy, description,
        MAX(CASE WHEN fund_group = 'General Fund Final Amended Budget' THEN field_data END) as budget,
        MAX(CASE WHEN fund_group = 'General Fund' THEN field_data END) as actual,
        ROUND(
          CAST(MAX(CASE WHEN fund_group = 'General Fund' THEN field_data END) AS REAL) -
          CAST(MAX(CASE WHEN fund_group = 'General Fund Final Amended Budget' THEN field_data END) AS REAL),
          2
        ) as variance
      FROM f65_financial_data
      WHERE ${whereSql}
        AND fund_group IN ('General Fund', 'General Fund Final Amended Budget')
      GROUP BY lu_name, lu_nametype, fy, description
      HAVING budget IS NOT NULL OR actual IS NOT NULL
      ORDER BY lu_name, fy, description
      LIMIT ${limit}
    `;
    return executeQuery(env, 'mi_f65', pivotQuery, params);
  }

  // Standard query
  const query = `
    SELECT lu_name, lu_nametype, fy, fund_group, description,
           field_data, notes, account_number
    FROM f65_financial_data
    WHERE ${whereSql}
    ORDER BY lu_name, fy, fund_group, description
    LIMIT ${limit}
  `;
  return executeQuery(env, 'mi_f65', query, params);
}

async function handleQueryMillageRates(
  args: Record<string, unknown>,
  env: Env
) {
  const whereClauses: string[] = [];
  const params: unknown[] = [];

  if (args.tax_year) {
    whereClauses.push('tax_year = ?');
    params.push(args.tax_year);
  }
  if (args.county) {
    whereClauses.push('county_name LIKE ? COLLATE NOCASE');
    params.push(`%${args.county}%`);
  }
  if (args.entity_name) {
    whereClauses.push('entity_name LIKE ? COLLATE NOCASE');
    params.push(`%${args.entity_name}%`);
  }
  if (args.entity_type) {
    whereClauses.push('entity_type = ?');
    params.push(args.entity_type);
  }
  if (args.sheet_source) {
    whereClauses.push('sheet_source = ?');
    params.push(args.sheet_source);
  }
  if (args.millage_category) {
    whereClauses.push('millage_category LIKE ? COLLATE NOCASE');
    params.push(`%${args.millage_category}%`);
  }

  const limit = clampLimit((args.limit as number) || 200, 1000);
  const whereSQL = whereClauses.length > 0
    ? 'WHERE ' + whereClauses.join(' AND ')
    : '';

  // Aggregate mode
  if (args.aggregate_by) {
    const groupCol: Record<string, string> = {
      county: 'county_name',
      entity: 'entity_name, entity_type',
      entity_type: 'entity_type',
      sheet_source: 'sheet_source',
      category: 'millage_category',
    };
    const col = groupCol[args.aggregate_by as string] || 'entity_type';
    const query = `
      SELECT ${col},
             COUNT(*) as levy_count,
             ROUND(SUM(millage_rate), 4) as total_mills,
             ROUND(AVG(millage_rate), 4) as avg_mills,
             ROUND(MIN(millage_rate), 4) as min_mills,
             ROUND(MAX(millage_rate), 4) as max_mills
      FROM millage_rates
      ${whereSQL}
      GROUP BY ${col}
      ORDER BY total_mills DESC
      LIMIT ${limit}
    `;
    return executeQuery(env, 'mi_f65', query, params);
  }

  // Detail mode
  const query = `
    SELECT county_name, entity_code, entity_name, entity_type,
           millage_category, millage_rate, sheet_source
    FROM millage_rates
    ${whereSQL}
    ORDER BY county_name, entity_type, entity_name, millage_category
    LIMIT ${limit}
  `;
  return executeQuery(env, 'mi_f65', query, params);
}

async function handleQueryDashboardMetrics(
  args: Record<string, unknown>,
  env: Env
) {
  const whereClauses: string[] = [];
  const params: unknown[] = [];

  if (args.variable) {
    whereClauses.push('variable = ?');
    params.push(args.variable);
  }
  if (args.municipality) {
    whereClauses.push('name LIKE ? COLLATE NOCASE');
    params.push(`%${args.municipality}%`);
  }
  if (args.entity_type) {
    whereClauses.push('entity_type = ?');
    params.push(args.entity_type);
  }
  if (args.county) {
    whereClauses.push('county_name LIKE ? COLLATE NOCASE');
    params.push(`%${args.county}%`);
  }
  if (args.year) {
    whereClauses.push('year = ?');
    params.push(args.year);
  }
  if (args.year_start) {
    whereClauses.push('year >= ?');
    params.push(args.year_start);
  }
  if (args.year_end) {
    whereClauses.push('year <= ?');
    params.push(args.year_end);
  }

  const limit = clampLimit((args.limit as number) || 200, 1000);
  const whereSQL = whereClauses.length > 0
    ? 'WHERE ' + whereClauses.join(' AND ')
    : '';

  // Aggregate mode
  if (args.aggregate_by) {
    const groupCol: Record<string, string> = {
      county: 'county_name',
      entity_type: 'entity_type',
      year: 'year',
    };
    const col = groupCol[args.aggregate_by as string] || 'entity_type';
    const query = `
      SELECT ${col},
             COUNT(*) as record_count,
             ROUND(AVG(value), 4) as avg_value,
             ROUND(MIN(value), 4) as min_value,
             ROUND(MAX(value), 4) as max_value
      FROM dashboard_metrics
      ${whereSQL}
      GROUP BY ${col}
      ORDER BY avg_value DESC
      LIMIT ${limit}
    `;
    return executeQuery(env, 'mi_f65', query, params);
  }

  // Detail mode
  const query = `
    SELECT name, entity_type, county_name, year,
           variable, analytics_desc, value, municode
    FROM dashboard_metrics
    ${whereSQL}
    ORDER BY name, year
    LIMIT ${limit}
  `;
  return executeQuery(env, 'mi_f65', query, params);
}

async function handleExecuteQuery(
  dbName: DatabaseName,
  query: string,
  env: Env
) {
  // The executeQuery function will validate that it's read-only
  return executeQuery(env, dbName, query);
}
