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
} from './database';

// Tool names for type safety
export type ToolName =
  | 'list_databases'
  | 'list_tables'
  | 'describe_table'
  | 'get_recent_records'
  | 'filter_by_column'
  | 'search_records'
  | 'get_summary_stats'
  | 'query_by_date_range'
  | 'execute_query';

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
      name: 'list_databases',
      description:
        'List all available databases and their descriptions. Use this first to see what data is available.',
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

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// Tool handlers

function handleListDatabases() {
  const databases = getAvailableDatabases();
  return {
    databases: databases.map((db) => ({
      name: db.name,
      displayName: db.displayName,
      description: getDatabaseDescription(db.name),
    })),
    usage:
      'Use list_tables with a database name to see available tables, then describe_table to see columns.',
  };
}

function getDatabaseDescription(name: DatabaseName): string {
  const descriptions: Record<DatabaseName, string> = {
    holly:
      'Holly municipal data including budget snapshots, capital assets, and departmental data',
    rockford:
      'Rockford water and sewer rate data, meter summaries, and customer class information',
    historical:
      'Historical budget data across multiple years with fund, activity, and account details',
  };
  return descriptions[name];
}

async function handleListTables(dbName: DatabaseName, env: Env) {
  const tables = await getTables(env, dbName);
  return {
    database: dbName,
    tableCount: tables.length,
    tables: tables,
    hint: 'Use describe_table to see columns and row counts for a specific table',
  };
}

async function handleDescribeTable(
  dbName: DatabaseName,
  tableName: string,
  env: Env
) {
  const columns = await getTableColumns(env, dbName, tableName);
  const rowCount = await getTableRowCount(env, dbName, tableName);

  return {
    database: dbName,
    table: tableName,
    rowCount,
    columnCount: columns.length,
    columns: columns.map((col) => ({
      name: col.name,
      type: col.type,
      nullable: col.notnull === 0,
      primaryKey: col.pk === 1,
      defaultValue: col.dflt_value,
    })),
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
