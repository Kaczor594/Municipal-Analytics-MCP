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
} from './database';
import {
  getDatabaseMetadata,
  getTableMetadata,
  getColumnMetadata,
} from './metadata';

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
            enum: ['holly', 'rockford', 'historical'],
            description:
              "Database to query: 'holly' (Holly Data Bronze), 'rockford' (Rockford), or 'historical' (Historical Budgets)",
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
            enum: ['holly', 'rockford', 'historical'],
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
            enum: ['holly', 'rockford', 'historical'],
            description:
              "Database to get dictionary for: 'holly' (Village of Holly, MI - water/sewer/budget), 'rockford' (City of Rockford, MI - water/sewer rates), 'historical' (multi-year budget history)",
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
            enum: ['holly', 'rockford', 'historical'],
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
            enum: ['holly', 'rockford', 'historical'],
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
            enum: ['holly', 'rockford', 'historical'],
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
            enum: ['holly', 'rockford', 'historical'],
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
            enum: ['holly', 'rockford', 'historical'],
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
      name: 'execute_query',
      description:
        'Execute a custom read-only SQL SELECT query. For advanced users who need specific queries not covered by other tools.',
      inputSchema: {
        type: 'object',
        properties: {
          database: {
            type: 'string',
            enum: ['holly', 'rockford', 'historical'],
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
      holly:
        'Village of Holly, MI — water/sewer billing, budgets, capital assets, debt schedules, water production.',
      rockford:
        'City of Rockford, MI — water/sewer rate study with billing history, rate schedules, class/meter summaries.',
      historical:
        'Multi-year historical budget data (2004–2026) for Michigan municipalities including Lexington.',
    },
    tableSelectionGuide: {
      'Billing/revenue questions (Holly)': {
        primaryTable: 'history_register_data',
        description:
          'Detailed billing transactions. Use for: total revenue, revenue by class/service/customer, billing trends.',
        keyColumns: 'bill_item_name (service type), class (RE/CO/SC/IN), amount (USD), billed_usage, government_type',
      },
      'Billing/revenue questions (Rockford)': {
        primaryTable: 'rockford_hrd',
        description:
          'Combined billing with meter sizes. Use for: revenue analysis by class, meter size, or rate code.',
        keyColumns: 'rate (service description), class, amount, billed_usage, meter_size, fye (fiscal year)',
      },
      'Pre-computed summaries': {
        tables: [
          'water_class_summary / sewer_class_summary — totals by customer class',
          'water_government_type_summary / sewer_government_type_summary — totals by Village/Township (Holly only)',
          'fye_YYYY_water_class_summary / fye_YYYY_sewer_class_summary — by class per fiscal year (Rockford)',
          'fye_YYYY_water_meter_summary / fye_YYYY_sewer_meter_summary — by meter size per fiscal year (Rockford)',
        ],
        note: 'These are faster than querying raw billing data. Use them when they answer the question directly.',
      },
      'Budget questions (Holly)': {
        primaryTable: 'budget_data',
        description:
          'Multi-year budget (FY2021–2026) with GL account detail. For single-year budgets, use general_25_26, water_25_26, sewer_25_26, etc.',
        keyColumns: 'gl_number, description, amount_2021 through amount_2026, fund_number, account_type',
      },
      'Budget questions (Historical)': {
        primaryTable: 'historical_budget_data',
        description:
          'Budget data from 2004–2026 across municipalities. Filter by model_name for specific municipality/version.',
        keyColumns: 'model_name, fund_name, description, amount_2004 through amount_2026, Assumption',
      },
      'Rate schedules': {
        holly: 'rate_schedule — current rate tiers by fiscal year',
        rockford: 'rate_schedule_history — historical rates FY2012–2026 by meter size and service type',
      },
      'Customer/account lookups': {
        holly: 'meter_sizes — account details with meter info. history_register_data — billing by account.',
        rockford: 'rockford_hrd — billing by account with meter size.',
      },
      'Capital assets (Holly)': {
        table: 'capital_assets',
        description: 'Fixed asset register with cost, depreciation, and net book value.',
      },
      'Debt schedules (Holly)': {
        tables: 'debt_schedule_2015_go_bond, debt_schedule_wtr_rev_2014, debt_schedule_wtr_ref_2014, debt_schedule_cap_imp_2021',
      },
      'Water production (Holly)': {
        tables: 'water_pumped_2020_2021 through water_pumped_2024_2025 — daily water production from wells.',
      },
    },
    importantWarnings: [
      'NUMERIC DATA: Most numeric columns (amount, billed_usage, billed_units, budget amounts) are now stored as REAL. You can use SUM/AVG directly without CAST. However, the rate_schedule_history table (Rockford) and historical_budget_data amount columns may still be TEXT — use CAST(column AS REAL) if aggregation returns unexpected results.',
      'FISCAL YEARS: Holly and Rockford use July 1 – June 30 fiscal years. "FY2025-26" = July 2025 to June 2026. Budget tables ending in _25_26 are for FY2025-26.',
      'CUSTOMER CLASSES: Holly uses codes (RE=Residential, CO=Commercial, SC=Special Contract, IN=Industrial). Rockford uses full names (Residential, Commercial, Industrial).',
      'NULL VALUES: Some columns have NULL or empty values. Use COALESCE or IS NOT NULL filters when aggregating.',
    ],
    tips: [
      'Use pre-computed summary tables when available — they are faster and already aggregated correctly.',
      'When querying history_register_data, filter by bill_item_name to isolate water vs sewer charges.',
      'For year-over-year comparisons, budget_data has amounts for FY2021–2026 in a single row per GL account.',
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
  const safeLimit = Math.min(Math.max(1, limit), 100);

  // Validate table name
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
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
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
    throw new Error('Invalid table name');
  }

  const safeLimit = Math.min(Math.max(1, limit), 500);
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
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
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

  const safeLimit = Math.min(Math.max(1, limit), 200);
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
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
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
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
    throw new Error('Invalid table name');
  }
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(dateColumn)) {
    throw new Error('Invalid column name');
  }

  // Validate date format (basic check)
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
    throw new Error('Invalid date format. Use YYYY-MM-DD');
  }

  const safeLimit = Math.min(Math.max(1, limit), 500);

  const query = `
    SELECT * FROM "${tableName}"
    WHERE "${dateColumn}" >= ? AND "${dateColumn}" <= ?
    ORDER BY "${dateColumn}" DESC
    LIMIT ${safeLimit}
  `;

  return executeQuery(env, dbName, query, [startDate, endDate]);
}

async function handleExecuteQuery(
  dbName: DatabaseName,
  query: string,
  env: Env
) {
  // The executeQuery function will validate that it's read-only
  return executeQuery(env, dbName, query);
}
