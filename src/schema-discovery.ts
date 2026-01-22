/**
 * Schema Discovery Module
 *
 * Provides utilities for automatically discovering database schemas,
 * table structures, and data patterns.
 */

import {
  Env,
  DatabaseName,
  getTables,
  getTableColumns,
  getTableRowCount,
  executeQuery,
  ColumnInfo,
  TableInfo,
} from './database';

export interface TableSchema {
  name: string;
  type: string;
  rowCount: number;
  columns: ColumnInfo[];
  sampleData?: Record<string, unknown>[];
}

export interface DatabaseSchema {
  name: DatabaseName;
  displayName: string;
  tables: TableSchema[];
  totalTables: number;
  totalRows: number;
}

/**
 * Get complete schema for a database
 */
export async function getDatabaseSchema(
  env: Env,
  dbName: DatabaseName,
  includeSampleData: boolean = false
): Promise<DatabaseSchema> {
  const displayNames: Record<DatabaseName, string> = {
    holly: 'Holly Data Bronze',
    rockford: 'Rockford',
    historical: 'Historical Budgets',
  };

  const tables = await getTables(env, dbName);
  const tableSchemas: TableSchema[] = [];
  let totalRows = 0;

  for (const table of tables) {
    const columns = await getTableColumns(env, dbName, table.name);
    const rowCount = await getTableRowCount(env, dbName, table.name);
    totalRows += rowCount;

    const schema: TableSchema = {
      name: table.name,
      type: table.type,
      rowCount,
      columns,
    };

    if (includeSampleData && rowCount > 0) {
      const sampleResult = await executeQuery(
        env,
        dbName,
        `SELECT * FROM "${table.name}" LIMIT 3`
      );
      if (sampleResult.success && sampleResult.data) {
        schema.sampleData = sampleResult.data;
      }
    }

    tableSchemas.push(schema);
  }

  return {
    name: dbName,
    displayName: displayNames[dbName],
    tables: tableSchemas,
    totalTables: tables.length,
    totalRows,
  };
}

/**
 * Find tables matching a pattern
 */
export async function findTables(
  env: Env,
  dbName: DatabaseName,
  pattern: string
): Promise<TableInfo[]> {
  const tables = await getTables(env, dbName);
  const lowerPattern = pattern.toLowerCase();

  return tables.filter((table) =>
    table.name.toLowerCase().includes(lowerPattern)
  );
}

/**
 * Find columns matching a pattern across all tables
 */
export async function findColumns(
  env: Env,
  dbName: DatabaseName,
  columnPattern: string
): Promise<{ table: string; columns: ColumnInfo[] }[]> {
  const tables = await getTables(env, dbName);
  const lowerPattern = columnPattern.toLowerCase();
  const results: { table: string; columns: ColumnInfo[] }[] = [];

  for (const table of tables) {
    const columns = await getTableColumns(env, dbName, table.name);
    const matchingColumns = columns.filter((col) =>
      col.name.toLowerCase().includes(lowerPattern)
    );

    if (matchingColumns.length > 0) {
      results.push({
        table: table.name,
        columns: matchingColumns,
      });
    }
  }

  return results;
}

/**
 * Get table relationships (based on naming conventions)
 * Looks for foreign key patterns like table_id
 */
export async function inferRelationships(
  env: Env,
  dbName: DatabaseName
): Promise<
  { sourceTable: string; sourceColumn: string; targetTable: string }[]
> {
  const tables = await getTables(env, dbName);
  const tableNames = new Set(tables.map((t) => t.name.toLowerCase()));
  const relationships: {
    sourceTable: string;
    sourceColumn: string;
    targetTable: string;
  }[] = [];

  for (const table of tables) {
    const columns = await getTableColumns(env, dbName, table.name);

    for (const column of columns) {
      const colLower = column.name.toLowerCase();

      // Check for _id suffix
      if (colLower.endsWith('_id')) {
        const potentialTable = colLower.replace(/_id$/, '');
        if (tableNames.has(potentialTable)) {
          relationships.push({
            sourceTable: table.name,
            sourceColumn: column.name,
            targetTable: potentialTable,
          });
        }
      }
    }
  }

  return relationships;
}

/**
 * Get summary statistics for numeric columns
 */
export async function getNumericColumnStats(
  env: Env,
  dbName: DatabaseName,
  tableName: string
): Promise<
  {
    column: string;
    min: number | null;
    max: number | null;
    avg: number | null;
    count: number;
  }[]
> {
  const columns = await getTableColumns(env, dbName, tableName);
  const numericColumns = columns.filter(
    (col) =>
      col.type.toUpperCase().includes('INT') ||
      col.type.toUpperCase().includes('REAL') ||
      col.type.toUpperCase().includes('FLOAT') ||
      col.type.toUpperCase().includes('DOUBLE') ||
      col.type.toUpperCase().includes('NUMERIC') ||
      col.type.toUpperCase().includes('DECIMAL')
  );

  const stats: {
    column: string;
    min: number | null;
    max: number | null;
    avg: number | null;
    count: number;
  }[] = [];

  for (const col of numericColumns) {
    const query = `
      SELECT
        MIN("${col.name}") as min_val,
        MAX("${col.name}") as max_val,
        AVG("${col.name}") as avg_val,
        COUNT("${col.name}") as count_val
      FROM "${tableName}"
    `;

    const result = await executeQuery(env, dbName, query);

    if (result.success && result.data && result.data.length > 0) {
      const row = result.data[0] as Record<string, unknown>;
      stats.push({
        column: col.name,
        min: row.min_val as number | null,
        max: row.max_val as number | null,
        avg: row.avg_val as number | null,
        count: row.count_val as number,
      });
    }
  }

  return stats;
}

/**
 * Get distinct values for a column (useful for understanding categorical data)
 */
export async function getDistinctValues(
  env: Env,
  dbName: DatabaseName,
  tableName: string,
  columnName: string,
  limit: number = 50
): Promise<{ value: unknown; count: number }[]> {
  // Validate inputs
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
    throw new Error('Invalid table name');
  }
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(columnName)) {
    throw new Error('Invalid column name');
  }

  const query = `
    SELECT "${columnName}" as value, COUNT(*) as count
    FROM "${tableName}"
    GROUP BY "${columnName}"
    ORDER BY count DESC
    LIMIT ${limit}
  `;

  const result = await executeQuery(env, dbName, query);

  if (result.success && result.data) {
    return result.data as { value: unknown; count: number }[];
  }

  return [];
}
