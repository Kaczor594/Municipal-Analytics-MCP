# Example Questions for Claude

Here are examples of questions you can ask Claude to query the municipal analytics databases. These range from simple exploration to more complex analysis.

## Getting Started

### Explore Available Data

> "What databases are available?"

> "List all tables in the Holly database"

> "What columns are in the budget_data table?"

> "Describe the structure of the Sheet1 table in the Rockford database"

## Budget Analysis (Historical Database)

### View Budget Data

> "Show me the most recent 20 records from the Tabelle1 table in the historical database"

> "What funds are available in the historical budgets data?"

> "Show budget data for the General Fund"

### Budget Trends

> "What were the budget amounts for 2023 and 2024 in the historical database?"

> "Show me all budget line items where the description contains 'salary'"

> "Compare budgets between 2022 and 2024"

### Fund Analysis

> "Get summary statistics for the amount_2024 column in the historical database"

> "Show all expenditures grouped by fund name"

> "What are the largest budget items for 2025?"

## Rate Studies (Rockford Database)

### Water Rates

> "List all tables in the Rockford database"

> "Show me the water rates from Sheet1"

> "What were the FYE_2024 and FYE_2025 water rates?"

### Meter Summaries

> "Describe the fye_2024_water_meter_summary table"

> "Show me the water meter summary for fiscal year 2024"

> "What is the customer count by meter size for water in 2025?"

### Sewer Data

> "Show the sewer class summary for fiscal year 2024"

> "Compare water and sewer customer counts for 2024"

> "What percentage of revenue comes from each customer class?"

## Municipal Data (Holly Database)

### Budget Snapshots

> "List all tables in the Holly database"

> "Show me the budget data as of June 30, 2024"

> "What departments are in the Holly budget data?"

### Department Analysis

> "Show budget items for the Police department"

> "Compare General Fund budgets between fiscal years"

> "What are the capital assets in the Holly database?"

### Financial Exploration

> "Search for records containing 'water' in the Holly database"

> "Show all records where fund_name contains 'General'"

> "Get summary statistics for the Holly budget data"

## Advanced Queries

### Custom SQL Queries

> "Run this query on the historical database: SELECT fund_name, SUM(amount_2024) as total FROM Tabelle1 GROUP BY fund_name ORDER BY total DESC LIMIT 10"

> "Execute a query to find all budget items over $100,000 in 2024"

### Cross-Table Analysis

> "What tables in the Rockford database have customer_count columns?"

> "Show me records from any table that mention 'residential'"

### Data Quality

> "How many rows are in each table in the Holly database?"

> "Are there any null values in the fund_name column?"

> "Show distinct values in the account_type column"

## Date-Based Queries

> "Show records from the as_of_6_30_24 table"

> "Compare fiscal year 2023 data to fiscal year 2024"

> "What budget changes occurred between June 2023 and June 2024?"

## Tips for Better Queries

### Be Specific About the Database

Instead of: "Show me budget data"

Try: "Show me budget data from the historical database"

### Ask About Structure First

Before querying data, ask about available tables and columns:
1. "What tables are in the [database] database?"
2. "Describe the [table] table"
3. Then ask your actual question

### Use Filters for Large Tables

Instead of: "Show me all records"

Try: "Show me the first 50 records from [table]" or "Show records where [column] = [value]"

### Ask for Summaries

For large datasets, ask for aggregated data:
- "Get summary statistics for..."
- "Show counts grouped by..."
- "What is the average..."

## Common Workflows

### Understanding a New Table

1. "Describe the [table] table in the [database] database"
2. "Show me 5 sample records from [table]"
3. "What are the distinct values in [key column]?"
4. Ask your specific question

### Budget Comparison

1. "Show budget amounts for [year1] and [year2]"
2. "Calculate the difference between years"
3. "Which items had the largest changes?"

### Rate Analysis

1. "Show the rate table structure"
2. "List rates for [fiscal year]"
3. "Compare rates across multiple years"

## Getting Help

If you're not sure how to phrase a question:

> "What tools are available for querying the databases?"

> "What kind of queries can I run on the municipal data?"

> "Help me understand the data structure"

Claude will guide you through the available options!
