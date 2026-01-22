/**
 * Database Module
 *
 * Provides D1 database connection logic, query execution,
 * and utility functions for safe database operations.
 */

// Environment bindings from wrangler.toml
export interface Env {
  HOLLY_DB: D1Database;
  ROCKFORD_DB: D1Database;
  HISTORICAL_DB: D1Database;
  MAX_RESULT_ROWS?: string;
  QUERY_TIMEOUT_MS?: string;
}

// Database name mapping
export type DatabaseName = 'holly' | 'rockford' | 'historical';

const DATABASE_DISPLAY_NAMES: Record<DatabaseName, string> = {
  holly: 'Holly Data Bronze',
  rockford: 'Rockford',
  historical: 'Historical Budgets',
};

// Query result types
export interface QueryResult {
  success: boolean;
  data?: Record<string, unknown>[];
  rowCount?: number;
  truncated?: boolean;
  error?: string;
  database?: string;
}

export interface TableInfo {
  name: string;
  type: string;
}

export interface ColumnInfo {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: string | null;
  pk: number;
}

/**
 * Get the D1 database binding for a given database name
 */
export function getDatabase(env: Env, dbName: DatabaseName): D1Database {
  switch (dbName) {
    case 'holly':
      return env.HOLLY_DB;
    case 'rockford':
      return env.ROCKFORD_DB;
    case 'historical':
      return env.HISTORICAL_DB;
    default:
      throw new Error(`Unknown database: ${dbName}`);
  }
}

/**
 * Get max rows limit from environment
 */
function getMaxRows(env: Env): number {
  return parseInt(env.MAX_RESULT_ROWS || '1000', 10);
}

/**
 * Validate that a query is read-only (SELECT only)
 */
export function validateReadOnlyQuery(query: string): void {
  const trimmedQuery = query.trim().toUpperCase();

  // Must start with SELECT, WITH (for CTEs), or PRAGMA (for schema)
  const allowedPrefixes = ['SELECT', 'WITH', 'PRAGMA'];
  const startsWithAllowed = allowedPrefixes.some((prefix) =>
    trimmedQuery.startsWith(prefix)
  );

  if (!startsWithAllowed) {
    throw new Error('Only SELECT queries are allowed');
  }

  // Check for forbidden keywords that could modify data
  const forbiddenKeywords = [
    'INSERT',
    'UPDATE',
    'DELETE',
    'DROP',
    'ALTER',
    'CREATE',
    'REPLACE',
    'TRUNCATE',
    'ATTACH',
    'DETACH',
  ];

  for (const keyword of forbiddenKeywords) {
    // Look for keyword as a whole word (not part of column name)
    const regex = new RegExp(`\\b${keyword}\\b`, 'i');
    if (regex.test(query)) {
      throw new Error(`Query contains forbidden keyword: ${keyword}`);
    }
  }
}

/**
 * Execute a read-only query on the specified database
 */
export async function executeQuery(
  env: Env,
  dbName: DatabaseName,
  query: string,
  params: unknown[] = []
): Promise<QueryResult> {
  try {
    // Validate query is read-only
    validateReadOnlyQuery(query);

    const db = getDatabase(env, dbName);
    const maxRows = getMaxRows(env);

    // Add LIMIT if not present to prevent huge result sets
    const limitedQuery = addLimitIfNeeded(query, maxRows + 1);

    // Execute the query
    const result = await db
      .prepare(limitedQuery)
      .bind(...params)
      .all();

    // Check if results were truncated
    const truncated = result.results.length > maxRows;
    const data = truncated ? result.results.slice(0, maxRows) : result.results;

    return {
      success: true,
      data: data as Record<string, unknown>[],
      rowCount: data.length,
      truncated,
      database: DATABASE_DISPLAY_NAMES[dbName],
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown database error';
    console.error(`Database query error (${dbName}): ${errorMessage}`);

    return {
      success: false,
      error: errorMessage,
      database: DATABASE_DISPLAY_NAMES[dbName],
    };
  }
}

/**
 * Add LIMIT clause if query doesn't already have one
 */
function addLimitIfNeeded(query: string, limit: number): string {
  const upperQuery = query.toUpperCase();

  // Don't add limit to PRAGMA queries
  if (upperQuery.trim().startsWith('PRAGMA')) {
    return query;
  }

  // Check if query already has LIMIT
  if (upperQuery.includes('LIMIT')) {
    return query;
  }

  // Add LIMIT before any trailing semicolon
  const trimmedQuery = query.trim().replace(/;$/, '');
  return `${trimmedQuery} LIMIT ${limit}`;
}

/**
 * Get list of all tables in a database
 */
export async function getTables(
  env: Env,
  dbName: DatabaseName
): Promise<TableInfo[]> {
  const query = `
    SELECT name, type
    FROM sqlite_master
    WHERE type IN ('table', 'view')
    AND name NOT LIKE 'sqlite_%'
    AND name NOT LIKE '_cf_%'
    ORDER BY name
  `;

  const result = await executeQuery(env, dbName, query);

  if (!result.success || !result.data) {
    return [];
  }

  return result.data as unknown as TableInfo[];
}

/**
 * Get column information for a specific table
 */
export async function getTableColumns(
  env: Env,
  dbName: DatabaseName,
  tableName: string
): Promise<ColumnInfo[]> {
  // Validate table name to prevent SQL injection
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
    throw new Error('Invalid table name');
  }

  const query = `PRAGMA table_info("${tableName}")`;
  const result = await executeQuery(env, dbName, query);

  if (!result.success || !result.data) {
    return [];
  }

  return result.data as unknown as ColumnInfo[];
}

/**
 * Get row count for a table
 */
export async function getTableRowCount(
  env: Env,
  dbName: DatabaseName,
  tableName: string
): Promise<number> {
  // Validate table name
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
    throw new Error('Invalid table name');
  }

  const query = `SELECT COUNT(*) as count FROM "${tableName}"`;
  const result = await executeQuery(env, dbName, query);

  if (!result.success || !result.data || result.data.length === 0) {
    return 0;
  }

  return (result.data[0] as { count: number }).count;
}

/**
 * Build a safe WHERE clause from filter conditions
 */
export function buildWhereClause(
  filters: Record<string, unknown>
): { clause: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];

  for (const [column, value] of Object.entries(filters)) {
    // Validate column name
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(column)) {
      continue; // Skip invalid column names
    }

    if (value === null) {
      conditions.push(`"${column}" IS NULL`);
    } else if (typeof value === 'string' && value.includes('%')) {
      // LIKE query
      conditions.push(`"${column}" LIKE ?`);
      params.push(value);
    } else {
      conditions.push(`"${column}" = ?`);
      params.push(value);
    }
  }

  return {
    clause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
  };
}

/**
 * Get all available databases
 */
export function getAvailableDatabases(): {
  name: DatabaseName;
  displayName: string;
}[] {
  return [
    { name: 'holly', displayName: 'Holly Data Bronze' },
    { name: 'rockford', displayName: 'Rockford' },
    { name: 'historical', displayName: 'Historical Budgets' },
  ];
}
