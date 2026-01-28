/**
 * Data Dictionary for Municipal Analytics Databases
 *
 * Provides human-readable descriptions of every database, table, and notable column
 * so that Claude can understand the data without exploratory queries.
 */

export interface ColumnMetadata {
  displayName?: string;
  description: string;
  unit?: string;
  knownValues?: Record<string, string>;
}

export interface TableMetadata {
  description: string;
  category?: string;
  columns?: Record<string, ColumnMetadata>;
}

export interface TableGrouping {
  description: string;
  tables: string[];
}

export interface DatabaseMetadata {
  municipality: string;
  state: string;
  description: string;
  fiscalYearConvention: string;
  currency: string;
  customerClassCodes: Record<string, string>;
  tableGroups?: Record<string, TableGrouping>;
  tables: Record<string, TableMetadata>;
}

export const DATA_DICTIONARY: Record<string, DatabaseMetadata> = {
  holly: {
    municipality: "Village of Holly",
    state: "Michigan",
    description:
      "Village of Holly, Michigan — water, sewer, and general fund financial data including utility billing history, budgets, capital assets, debt schedules, and water production records.",
    fiscalYearConvention:
      "July 1 – June 30. 'FY2025-26' means July 2025 through June 2026. Tables named '25_26' refer to this fiscal year.",
    currency: "USD",
    customerClassCodes: {
      RE: "Residential",
      CO: "Commercial",
      SC: "Special Contract",
      IN: "Industrial",
    },
    tableGroups: {
      // =====================================================================
      // QUICK ANSWER VIEWS (Start Here for Natural Language Queries)
      // These views are optimized for common questions from non-technical users
      // =====================================================================
      "Quick Answers": {
        description: "START HERE. Pre-built views that answer common questions directly. Use these before querying raw tables.",
        tables: [
          "current_rates",           // "What are the water/sewer rates?"
          "current_budget",          // "What's budgeted this year?"
          "budget_by_fund",          // "Budget by fund?"
          "customer_counts",         // "How many customers?"
          "revenue_by_class",        // "Revenue breakdown by customer type?"
          "revenue_by_jurisdiction", // "Village vs Township revenue?"
          "water_production_summary", // "How much water do we pump?"
          "all_debt_schedules",      // "What debt do we have?"
          "assets_summary",          // "What assets do we own?"
          "table_inventory",         // "What data is available?"
        ],
      },

      // =====================================================================
      // REVENUE & BILLING - Questions about money coming in
      // =====================================================================
      "Revenue & Billing": {
        description: "Utility billing data and revenue summaries. Use for questions about customers, usage, revenue, and billing.",
        tables: [
          "history_register_data",   // Raw billing transactions (129K+ rows, indexed)
          "meter_sizes",             // Account meter configurations
          "water_class_summary",     // Water revenue by class (RE, CO, SC, IN)
          "sewer_class_summary",     // Sewer revenue by class
          "water_government_type_summary", // Water by Village/Township
          "sewer_government_type_summary", // Sewer by Village/Township
          "water_item_summary",      // Water by bill item type
          "sewer_item_summary",      // Sewer by bill item type
          "water_status_summary",    // Water by account status
          "sewer_status_summary",    // Sewer by account status
        ],
      },

      // =====================================================================
      // BUDGETS - Questions about spending and appropriations
      // =====================================================================
      "Budgets": {
        description: "Budget data from FY2021 through FY2026. Use for questions about spending, appropriations, and fund balances.",
        tables: [
          "budget_final",            // Multi-year consolidated (PREFERRED)
          "budget_all_funds_2026",   // FY2025-26 all funds combined (formerly 'six_budget')
          "budget_ytd_2024",         // Year-to-date through 6/30/24 (formerly 'four')
          "budget_ytd_2025",         // Year-to-date through 6/30/25 (formerly 'five')
          "general_25_26",           // General Fund FY2025-26
          "water_25_26",             // Water Fund FY2025-26
          "sewer_25_26",             // Sewer Fund FY2025-26
          "refuse_25_26",            // Refuse Fund FY2025-26
          "major_street_25_26",      // Major Street Fund FY2025-26
          "local_street_25_26",      // Local Street Fund FY2025-26
          "lake_improvement_25_26",  // Lake Improvement Fund FY2025-26
        ],
      },

      // =====================================================================
      // OPERATIONS - Water production and rates
      // =====================================================================
      "Operations": {
        description: "Operational data: water production from wells, rate schedules.",
        tables: [
          "water_production",        // Consolidated daily production (all years)
          "rate_schedule",           // Water/sewer rates by fiscal year
        ],
      },

      // =====================================================================
      // CAPITAL & DEBT - Assets, projects, and bond payments
      // =====================================================================
      "Capital & Debt": {
        description: "Capital assets, improvement projects, and debt/bond payment schedules.",
        tables: [
          "capital_assets",                  // Fixed asset register
          "rowe_cip_summary_of_projects",    // Capital improvement projects
          "rowe_cip_projects_status",        // Project status tracking
          "rowe_cip_funding_expenditures",   // Project funding
          "critical_road_improvements_1",    // Road projects list
          "critical_road_improvements_2",    // Road projects list (cont.)
          "debt_schedule_2015_go_bond",      // 2015 General Obligation Bond
          "debt_schedule_wtr_rev_2014",      // 2014 Water Revenue Bond
          "debt_schedule_wtr_ref_2014",      // 2014 Water Refunding Bond
          "debt_schedule_cap_imp_2021",      // 2021 Capital Improvement Bond
        ],
      },

      // =====================================================================
      // CUSTOMER ANALYSIS - Service combinations and classifications
      // =====================================================================
      "Customer Analysis": {
        description: "Customer segmentation by service type (water only, sewer only, both, etc.) and location classification.",
        tables: [
          "water_users",             // All water service customers
          "sewer_users",             // All sewer service customers
          "other_users",             // Customers with other services
          "water_only_users",        // Water only (no sewer)
          "sewer_only_users",        // Sewer only (no water)
          "other_only_users",        // Other services only
          "service_exclusive_users_summary", // Count by service combination
          "locationid_government_types",     // Location to jurisdiction mapping
        ],
      },

      // =====================================================================
      // DATA QUALITY - For administrators
      // =====================================================================
      "Data Quality": {
        description: "Data quality tracking and administrative views.",
        tables: [
          "data_quality_summary",            // Overview of data issues
          "missing_government_type_locations", // Locations needing classification
        ],
      },

      // =====================================================================
      // LEGACY TABLES - Original year-by-year tables (use consolidated versions instead)
      // =====================================================================
      "Legacy (Use Consolidated Instead)": {
        description: "Original year-by-year tables. Prefer consolidated tables (water_production, budget_final) for queries.",
        tables: [
          "water_pumped_2020_2021", "water_pumped_2021_2022", "water_pumped_2022_2023",
          "water_pumped_2023_2024", "water_pumped_2024_2025",
          "as_of_6_30_21", "as_of_6_30_22", "as_of_6_30_23", "as_of_6_30_24", "as_of_6_30_25",
          "four", "five",  // Legacy names for budget_ytd tables
        ],
      },
    },
    tables: {
      // --- Billing & Account Data ---
      history_register_data: {
        category: "Billing & Accounts",
        description:
          "Detailed utility billing transaction records for all accounts. Each row is one billing line item (e.g., water rate, sewer rate, bond debt charge). Key table for revenue analysis.",
        columns: {
          account_number: { description: "Unique account identifier (format: STREET-NUMBER-UNIT-SEQ)" },
          locationid: { description: "Location ID linking to physical service address" },
          service_address: { description: "Street address receiving utility service" },
          name: { description: "Account holder name" },
          cycle: { description: "Billing cycle number" },
          section: { description: "Billing section" },
          route: { description: "Meter reading route" },
          class: {
            description: "Customer class code",
            knownValues: { RE: "Residential", CO: "Commercial", SC: "Special Contract", IN: "Industrial" },
          },
          status: { description: "Account status (e.g., Active, Final)" },
          bill_item_name: {
            description: "Type of charge on the bill",
            knownValues: {
              "Water Rate": "Water usage charge",
              "Sewer": "Sewer usage charge",
              "Water Bond Debt": "Water infrastructure bond surcharge",
              "Refuse": "Trash collection charge",
            },
          },
          trx_type: { description: "Transaction type (e.g., Bill, Adjustment)" },
          trx_type_detail: { description: "Detailed transaction category" },
          rate: { description: "Rate code applied to this charge" },
          billed_usage: { description: "Quantity of utility consumed", unit: "gallons (water) or units" },
          billed_units: { description: "Number of billing units (typically 1000-gallon increments)" },
          amount: { description: "Dollar amount charged for this line item", unit: "USD" },
          created: { description: "Date the transaction was created" },
          posted: { description: "Date the transaction was posted" },
          simple_status: { description: "Simplified status (Active/Inactive)" },
          government_type: {
            description: "Jurisdictional classification of the account location",
            knownValues: { Village: "Within Village of Holly limits", Township: "In surrounding township" },
          },
        },
      },
      meter_sizes: {
        description:
          "Account meter configurations. Each row is one account with up to 4 service meters (water, sewer, etc). Includes current and previous reads, usage, meter type/size, and install dates.",
        columns: {
          meter_size: { description: "Physical meter size (e.g., '5/8 or 3/4', '1', '1 1/2', '2' inches)" },
          current_read: { description: "Current meter reading" },
          previous_read: { description: "Previous meter reading" },
          current_usage: { description: "Usage calculated as current_read minus previous_read" },
        },
      },

      // --- Class & Usage Summaries ---
      water_class_summary: {
        description:
          "Water billing summary grouped by customer class (RE, CO, SC, IN). Shows customer count, usage, and revenue by class with percentages.",
        columns: {
          class: { description: "Customer class code (RE=Residential, CO=Commercial, SC=Special Contract, IN=Industrial)" },
          customer_count: { description: "Number of customers in this class" },
          customer_pct: { description: "Percentage of total customers", unit: "%" },
          total_billed_usage: { description: "Total gallons billed to this class", unit: "gallons" },
          total_amount: { description: "Total revenue from this class", unit: "USD" },
          amount_pct: { description: "Percentage of total revenue", unit: "%" },
        },
      },
      sewer_class_summary: {
        description: "Sewer billing summary grouped by customer class. Same structure as water_class_summary.",
      },
      water_government_type_summary: {
        description: "Water billing summary grouped by government type (Village vs Township).",
      },
      sewer_government_type_summary: {
        description: "Sewer billing summary grouped by government type (Village vs Township).",
      },
      water_item_summary: {
        description: "Water billing summary grouped by bill item (e.g., Water Rate, Water Bond Debt).",
      },
      sewer_item_summary: {
        description: "Sewer billing summary grouped by bill item.",
      },
      water_status_summary: {
        description: "Water billing summary grouped by account status (Active, Final, etc.).",
      },
      sewer_status_summary: {
        description: "Sewer billing summary grouped by account status.",
      },

      // --- User Classification ---
      water_users: { description: "List of location IDs that have water service." },
      sewer_users: { description: "List of location IDs that have sewer service." },
      other_users: { description: "List of location IDs that have other services (refuse, etc.)." },
      water_only_users: { description: "Location IDs with ONLY water service (no sewer)." },
      sewer_only_users: { description: "Location IDs with ONLY sewer service (no water)." },
      other_only_users: { description: "Location IDs with ONLY other services." },
      service_exclusive_users_summary: {
        description: "Count of users by service combination (water-only, sewer-only, both, etc.).",
      },
      locationid_classifications: {
        description: "Maps location IDs to tax parcel IDs and property classifications.",
      },
      locationid_government_types: {
        description: "Maps location IDs to government type (Village or Township).",
      },
      abbr_locationid_government_types: {
        description: "Abbreviated version of location-to-government-type mapping.",
      },
      missing_government_type_locations: {
        description: "Location IDs that are missing a government type classification — data quality issue tracking.",
      },

      // --- Budget Tables ---
      budget_data: {
        description:
          "Multi-year budget data with account numbers and amounts from FY2021 through FY2026. Includes revenues and expenditures across all funds.",
        columns: {
          account_type: {
            description: "Revenue (R) or Expenditure (E)",
            knownValues: { R: "Revenue", E: "Expenditure" },
          },
          fund_number: { description: "Fund number (e.g., 101=General, 590=Sewer, 591=Water)" },
          gl_number: { description: "General ledger account number (format: FUND-DEPT-OBJECT)" },
          description: { description: "Line item description (e.g., 'REAL PROPERTY TAXES')" },
          amount_2021: { description: "Budget amount for FY2020-21", unit: "USD" },
          amount_2022: { description: "Budget amount for FY2021-22", unit: "USD" },
          amount_2023: { description: "Budget amount for FY2022-23", unit: "USD" },
          amount_2024: { description: "Budget amount for FY2023-24", unit: "USD" },
          amount_2025: { description: "Budget amount for FY2024-25", unit: "USD" },
          amount_2026: { description: "Budget amount for FY2025-26", unit: "USD" },
        },
      },
      budget_final: {
        description:
          "Final approved budget with same structure as budget_data. Use this for official budget figures.",
      },
      general_25_26: {
        description: "General Fund budget for FY2025-26 with prior year comparisons by department and GL account.",
        columns: {
          department_name: { description: "Department name (e.g., 'ESTIMATED REVENUES-GENERAL', 'POLICE DEPARTMENT')" },
          gl_number: { description: "General ledger account number" },
          description: { description: "Budget line item description" },
          fy2023_24_amended_budget: { description: "FY2023-24 amended budget", unit: "USD" },
          fy2024_25_amended_budget: { description: "FY2024-25 amended budget", unit: "USD" },
          fy2025_26_recommended_budget: { description: "FY2025-26 recommended budget", unit: "USD" },
        },
      },
      water_25_26: {
        description: "Water Fund budget for FY2025-26 with prior year comparisons. Same structure as general_25_26.",
      },
      sewer_25_26: {
        description: "Sewer Fund budget for FY2025-26 with prior year comparisons. Same structure as general_25_26. NOTE: Columns '...7' through '...10' are empty artifact columns from data import — ignore them.",
      },
      refuse_25_26: {
        description: "Refuse (trash) Fund budget for FY2025-26 with prior year comparisons.",
      },
      lake_improvement_25_26: {
        description: "Lake Improvement Fund budget for FY2025-26 with prior year comparisons.",
      },
      local_street_25_26: {
        description: "Local Street Fund budget for FY2025-26 with prior year comparisons.",
      },
      major_street_25_26: {
        description: "Major Street Fund budget for FY2025-26 with prior year comparisons.",
      },
      six_budget: {
        description: "Budget summary table (likely a sixth fund or supplementary budget view).",
      },

      // --- Year-End Budget Summaries ---
      as_of_6_30_21: { description: "Year-end budget summary as of June 30, 2021 (end of FY2020-21)." },
      as_of_6_30_22: { description: "Year-end budget summary as of June 30, 2022 (end of FY2021-22)." },
      as_of_6_30_23: { description: "Year-end budget summary as of June 30, 2023 (end of FY2022-23)." },
      as_of_6_30_24: { description: "Year-end budget summary as of June 30, 2024 (end of FY2023-24)." },
      as_of_6_30_25: { description: "Year-end budget summary as of June 30, 2025 (end of FY2024-25)." },

      // --- Capital Assets ---
      capital_assets: {
        description:
          "Fixed asset register for Village infrastructure (buildings, equipment, vehicles, etc.). Tracks acquisition, cost, depreciation, and disposals.",
        columns: {
          section: { description: "Asset category (e.g., 'Buildings and Building Improvements', 'Equipment')" },
          asset_number: { description: "Unique asset identifier" },
          date_acquired: { description: "Date asset was acquired (numeric format)" },
          description: { description: "Description of the asset" },
          condition_flag: { description: "Condition flag character (X=confirmed, ?=uncertain)" },
          extended_desc: { description: "Extended description of the asset" },
          asset_type: { description: "Asset type code (e.g., B=Building)" },
          dept_number: { description: "Department code (e.g., GG=General Government, PW=Public Works, F=Fire)" },
          location: { description: "Physical location of the asset" },
          useful_life_yrs: { description: "Expected useful life", unit: "years" },
          cost_at6_30_25: { description: "Asset cost as of June 30, 2025", unit: "USD" },
          additions: { description: "Asset additions during the year", unit: "USD" },
          reclassification: { description: "Reclassification adjustments", unit: "USD" },
          disposals_beginning: { description: "Disposals from beginning cost", unit: "USD" },
          cost_at_6_30_26: { description: "Asset cost as of June 30, 2026", unit: "USD" },
          accumulated_depreciation_beginning: { description: "Accumulated depreciation at start of year", unit: "USD" },
          depreciation_expense: { description: "Annual depreciation expense", unit: "USD" },
          disposals_depreciation: { description: "Depreciation removed for disposals", unit: "USD" },
          accumulated_depreciation_ending: { description: "Accumulated depreciation at end of year", unit: "USD" },
          adjusted_cost_at_6_30_26: { description: "Net book value (cost minus depreciation) at June 30, 2026", unit: "USD" },
        },
      },

      // --- Capital Improvement Projects ---
      critical_road_improvements_1: {
        description: "Critical road improvement projects list — page 1. Includes project descriptions and estimated costs.",
      },
      critical_road_improvements_2: {
        description: "Critical road improvement projects list — page 2.",
      },
      rowe_cip_summary_of_projects: {
        description: "Rowe Engineering capital improvement plan — summary of all projects.",
      },
      rowe_cip_projects_status: {
        description: "Rowe Engineering CIP — project status tracking.",
      },
      rowe_cip_funding_expenditures: {
        description: "Rowe Engineering CIP — funding sources and expenditure tracking.",
      },

      // --- Debt Schedules ---
      debt_schedule_2015_go_bond: {
        description: "Payment schedule for 2015 General Obligation Bond. Shows fiscal year, payment date, type (principal/interest), and amount.",
        columns: {
          fiscal_year_beginning: { description: "Start of fiscal year for this payment" },
          payment_date: { description: "Actual payment due date" },
          payment_type: { description: "Principal or Interest" },
          amount_paid: { description: "Payment amount", unit: "USD" },
        },
      },
      debt_schedule_wtr_rev_2014: {
        description: "Payment schedule for 2014 Water Revenue Bond.",
      },
      debt_schedule_wtr_ref_2014: {
        description: "Payment schedule for 2014 Water Refunding Bond.",
      },
      debt_schedule_cap_imp_2021: {
        description: "Payment schedule for 2021 Capital Improvement Bond.",
      },

      // --- Rate Schedule ---
      rate_schedule: {
        description:
          "Water and sewer rate schedule by fiscal year. Shows base rates and tiered usage rates (per 1000 gallons) for each customer class.",
        columns: {
          fye_beginning: { description: "Fiscal year start date" },
          fye_ending: { description: "Fiscal year end date" },
          water: { description: "Water base rate", unit: "USD/month" },
          sewer_: { description: "Sewer base rate", unit: "USD/month" },
          base_rate: { description: "Combined base rate", unit: "USD/month" },
        },
      },

      // --- Water Production ---
      water_pumped_2020_2021: {
        description: "Daily water production data for FY2020-21. Tracks gallons pumped from wells.",
        columns: {
          date: { description: "Date of production record" },
          avg: { description: "Average daily production", unit: "gallons" },
          max: { description: "Maximum daily production", unit: "gallons" },
          total: { description: "Total production for period", unit: "gallons" },
          million_gallons: { description: "Total production in millions of gallons", unit: "million gallons" },
        },
      },
      water_pumped_2021_2022: { description: "Daily water production data for FY2021-22." },
      water_pumped_2022_2023: { description: "Daily water production data for FY2022-23." },
      water_pumped_2023_2024: { description: "Daily water production data for FY2023-24." },
      water_pumped_2024_2025: { description: "Daily water production data for FY2024-25." },

      // --- Misc (Legacy names) ---
      four: { description: "LEGACY: Use budget_ytd_2024 instead. Year-to-date budget actuals through June 30, 2024." },
      five: { description: "LEGACY: Use budget_ytd_2025 instead. Year-to-date budget actuals through June 30, 2025." },

      // =====================================================================
      // NEW CONSOLIDATED TABLES (Added for Natural Language Query Optimization)
      // =====================================================================

      // --- Consolidated Water Production ---
      water_production: {
        category: "Operations",
        description:
          "Consolidated daily water production data from all fiscal years (FY2020-21 through FY2024-25). PREFERRED over individual water_pumped_* tables. Query by fiscal_year or fye columns to filter.",
        columns: {
          date: { description: "Date of production record" },
          avg: { description: "Average daily production", unit: "gallons" },
          max: { description: "Maximum daily production", unit: "gallons" },
          total: { description: "Total production for period", unit: "gallons" },
          million_gallons: { description: "Total production in millions of gallons", unit: "million gallons" },
          fiscal_year: { description: "Fiscal year label (e.g., '2023-2024')" },
          fye: { description: "Fiscal year ending (e.g., 2024 means FY2023-24)", unit: "year" },
        },
      },

      // --- Renamed Budget Tables (Clear names) ---
      budget_ytd_2024: {
        category: "Budgets",
        description: "Year-to-date budget actuals through June 30, 2024. Clearer name for legacy 'four' table.",
      },
      budget_ytd_2025: {
        category: "Budgets",
        description: "Year-to-date budget actuals through June 30, 2025. Clearer name for legacy 'five' table.",
      },
      budget_all_funds_2026: {
        category: "Budgets",
        description: "FY2025-26 budget for all funds combined in one table. Clearer name for legacy 'six_budget' table.",
        columns: {
          department_name: { description: "Department or revenue category name" },
          gl_number: { description: "General ledger account number" },
          description: { description: "Budget line item description" },
          amount: { description: "FY2025-26 budgeted amount", unit: "USD" },
          budget_fund_name: { description: "Fund name (General, Water, Sewer, etc.)" },
        },
      },

      // =====================================================================
      // SEMANTIC VIEWS (Optimized for Natural Language Queries)
      // These views match how non-technical users phrase questions
      // =====================================================================

      // --- Rate Views ---
      current_rates: {
        category: "Quick Answers",
        description: "VIEW: Current water and sewer rates (most recent fiscal year only). Use for 'What are the rates?' questions.",
      },
      rate_history: {
        category: "Quick Answers",
        description: "VIEW: All water and sewer rates over time, ordered by most recent first.",
      },

      // --- Revenue Summary Views ---
      water_revenue_summary: {
        category: "Quick Answers",
        description: "VIEW: Alias for water_class_summary. Water revenue breakdown by customer class.",
      },
      sewer_revenue_summary: {
        category: "Quick Answers",
        description: "VIEW: Alias for sewer_class_summary. Sewer revenue breakdown by customer class.",
      },
      revenue_by_class: {
        category: "Quick Answers",
        description: "VIEW: Combined water and sewer revenue by customer class (Residential, Commercial, etc.) with human-readable class names.",
        columns: {
          service_type: { description: "'Water' or 'Sewer'" },
          class: { description: "Customer class code (RE, CO, SC, IN)" },
          class_name: { description: "Human-readable class name (Residential, Commercial, etc.)" },
          customer_count: { description: "Number of customers" },
          revenue: { description: "Total revenue", unit: "USD" },
          revenue_percent: { description: "Percentage of total revenue", unit: "%" },
        },
      },
      revenue_by_jurisdiction: {
        category: "Quick Answers",
        description: "VIEW: Water and sewer revenue split by Village vs Township jurisdiction.",
        columns: {
          service_type: { description: "'Water' or 'Sewer'" },
          jurisdiction: { description: "'Village' or 'Township'" },
          customer_count: { description: "Number of customers" },
          revenue: { description: "Total revenue", unit: "USD" },
          revenue_percent: { description: "Percentage of total revenue", unit: "%" },
        },
      },

      // --- Budget Views ---
      current_budget: {
        category: "Quick Answers",
        description: "VIEW: Current year (FY2025-26) budget with prior year comparison. Shows only items with non-zero current budget.",
        columns: {
          account_type: { description: "'Revenue' or 'Expenditure'" },
          fund_number: { description: "Fund number" },
          gl_number: { description: "General ledger account number" },
          description: { description: "Budget line item description" },
          current_year_budget: { description: "FY2025-26 budget amount", unit: "USD" },
          prior_year_actual: { description: "FY2024-25 actual amount", unit: "USD" },
          change_from_prior: { description: "Difference from prior year", unit: "USD" },
        },
      },
      budget_by_fund: {
        category: "Quick Answers",
        description: "VIEW: Budget totals by fund and account type across all fiscal years (FY2021-2026).",
        columns: {
          fund_number: { description: "Fund number" },
          fund_name: { description: "Human-readable fund name" },
          account_type: { description: "'Revenue' or 'Expenditure'" },
          fy2021: { description: "FY2020-21 amount", unit: "USD" },
          fy2022: { description: "FY2021-22 amount", unit: "USD" },
          fy2023: { description: "FY2022-23 amount", unit: "USD" },
          fy2024: { description: "FY2023-24 amount", unit: "USD" },
          fy2025: { description: "FY2024-25 amount", unit: "USD" },
          fy2026: { description: "FY2025-26 amount", unit: "USD" },
        },
      },

      // --- Customer Views ---
      customer_counts: {
        category: "Quick Answers",
        description: "VIEW: Simple count of customers by service type (Water, Sewer, Water Only, Sewer Only, Other).",
        columns: {
          service_type: { description: "Service category" },
          customer_count: { description: "Number of customers" },
        },
      },

      // --- Operations Views ---
      water_production_summary: {
        category: "Quick Answers",
        description: "VIEW: Annual water production summary with totals and averages by fiscal year.",
        columns: {
          fiscal_year: { description: "Fiscal year label" },
          fye: { description: "Fiscal year ending" },
          days_recorded: { description: "Number of days with data" },
          total_gallons: { description: "Total gallons pumped", unit: "gallons" },
          avg_daily_gallons: { description: "Average daily production", unit: "gallons" },
          max_daily_gallons: { description: "Peak daily production", unit: "gallons" },
        },
      },

      // --- Capital & Debt Views ---
      all_debt_schedules: {
        category: "Quick Answers",
        description: "VIEW: All bond payment schedules combined into one queryable view. Includes bond name and type.",
        columns: {
          bond_name: { description: "Name of the bond (e.g., '2015 GO Bond')" },
          bond_type: { description: "Type of bond (General Obligation, Revenue, etc.)" },
          fiscal_year_beginning: { description: "Start of fiscal year for payment" },
          payment_date: { description: "Payment due date" },
          payment_type: { description: "'Principal' or 'Interest'" },
          amount_paid: { description: "Payment amount", unit: "USD" },
        },
      },
      assets_summary: {
        category: "Quick Answers",
        description: "VIEW: Capital assets summarized by category with total cost, depreciation, and net book value.",
        columns: {
          asset_category: { description: "Asset category (Buildings, Equipment, etc.)" },
          asset_count: { description: "Number of assets in category" },
          total_cost: { description: "Total acquisition cost", unit: "USD" },
          total_depreciation: { description: "Accumulated depreciation", unit: "USD" },
          net_book_value: { description: "Net book value (cost minus depreciation)", unit: "USD" },
        },
      },
      capital_projects: {
        category: "Quick Answers",
        description: "VIEW: Alias for rowe_cip_summary_of_projects. Capital improvement project list.",
      },

      // --- Administrative Views ---
      data_quality_summary: {
        category: "Data Quality",
        description: "VIEW: Summary of data quality issues for administrators (missing classifications, null values, etc.).",
        columns: {
          issue_type: { description: "Type of data quality issue" },
          record_count: { description: "Number of affected records" },
          description: { description: "Description of the issue" },
        },
      },
      table_inventory: {
        category: "Quick Answers",
        description: "VIEW: Master list of key tables with categories, descriptions, and natural language triggers. Use this to understand what data is available.",
        columns: {
          table_name: { description: "Name of the table" },
          category: { description: "Functional category" },
          description: { description: "What the table contains" },
          natural_language_triggers: { description: "Keywords that suggest using this table" },
        },
      },
    },
  },

  rockford: {
    municipality: "City of Rockford",
    state: "Michigan",
    description:
      "City of Rockford, Michigan — water and sewer rate study data including billing history, rate schedules, customer class summaries, and meter size analysis.",
    fiscalYearConvention:
      "July 1 – June 30. 'FYE 2025' means the fiscal year ending June 30, 2025 (July 2024 – June 2025).",
    currency: "USD",
    customerClassCodes: {
      Residential: "Residential customers",
      Commercial: "Commercial customers",
      Industrial: "Industrial customers",
    },
    tables: {
      // --- Billing History ---
      history_register_data_2024: {
        description:
          "Utility billing transactions for FY2023-24. Same structure as Holly's history_register_data with an additional 'fye' (fiscal year ending) column.",
      },
      history_register_data_2025: {
        description: "Utility billing transactions for FY2024-25.",
      },
      rockford_hrd: {
        description:
          "Combined billing history with meter size data. Merges history_register_data with meter_size for each account. Contains all fiscal years.",
      },

      // --- Rate Schedule ---
      rate_schedule_history: {
        description:
          "Historical water and sewer rate schedule from FY2012 through FY2026. Each row is a rate code (meter size + service type). Columns are fiscal years with monthly rates in USD.",
        columns: {
          row_label: { description: "Row number or label (e.g., '10% Disc')" },
          rate_code: { description: "Rate code (e.g., '01-001' for 5/8-3/4\" water)" },
          description: { description: "Rate description (meter size + service type, e.g., '5/8-3/4\" Water rts')" },
          FYE_2012: { description: "Monthly rate for FY ending 2012", unit: "USD/month" },
          FYE_2026: { description: "Monthly rate for FY ending 2026", unit: "USD/month" },
        },
      },

      // --- Class Summaries (by Fiscal Year) ---
      fye_2024_water_class_summary: {
        description: "FY2023-24 water billing by customer class (Residential, Commercial, Industrial). Shows customer count, usage, and revenue.",
      },
      fye_2025_water_class_summary: {
        description: "FY2024-25 water billing by customer class.",
      },
      fye_2024_sewer_class_summary: {
        description: "FY2023-24 sewer billing by customer class.",
      },
      fye_2025_sewer_class_summary: {
        description: "FY2024-25 sewer billing by customer class.",
      },

      // --- Meter Summaries ---
      fye_2024_water_meter_summary: {
        description: "FY2023-24 water billing grouped by meter size. Shows customer count, usage, and revenue per meter size.",
      },
      fye_2025_water_meter_summary: {
        description: "FY2024-25 water billing by meter size.",
      },
      fye_2024_sewer_meter_summary: {
        description: "FY2023-24 sewer billing by meter size.",
      },
      fye_2025_sewer_meter_summary: {
        description: "FY2024-25 sewer billing by meter size.",
      },

      // --- Expanded Meter Summaries ---
      fye_2024_water_expanded_meter_summary: {
        description: "FY2023-24 water billing by rate code (meter size + rate type). More granular than meter_summary.",
      },
      fye_2025_water_expanded_meter_summary: {
        description: "FY2024-25 water billing by rate code.",
      },
      fye_2024_sewer_expanded_meter_summary: {
        description: "FY2023-24 sewer billing by rate code.",
      },
      fye_2025_sewer_expanded_meter_summary: {
        description: "FY2024-25 sewer billing by rate code.",
      },

      // --- User Classification ---
      water_users: { description: "Location IDs with water service (includes FYE column for fiscal year)." },
      sewer_users: { description: "Location IDs with sewer service." },
      other_users: { description: "Location IDs with other services." },
      water_only_users: { description: "Location IDs with ONLY water service." },
      sewer_only_users: { description: "Location IDs with ONLY sewer service." },
      other_only_users: { description: "Location IDs with ONLY other services." },
      service_exclusive_users_summary: {
        description: "Count of users by service combination, with FYE column for fiscal year comparison.",
      },
    },
  },

  historical: {
    municipality: "Multiple municipalities",
    state: "Michigan",
    description:
      "Historical budget data for Michigan municipalities including Lexington. Contains revenue and expenditure data from 2004 through 2026 with GL account detail and budget assumptions.",
    fiscalYearConvention:
      "Varies by municipality. Amount columns (amount_2004 through amount_2026) represent calendar or fiscal years depending on the model.",
    currency: "USD",
    customerClassCodes: {},
    tables: {
      historical_budget_data: {
        description:
          "Consolidated historical budget data. Each row is one GL account line item for a specific budget model (municipality + version). Contains annual amounts from 2004–2026 and budget assumptions.",
        columns: {
          model_name: {
            description: "Budget model identifier — municipality name + version date (e.g., 'Lexington model 2-9-24')",
          },
          account_type: {
            description: "Revenue or Expenditure",
            knownValues: { R: "Revenue", E: "Expenditure" },
          },
          fund_number: { description: "Fund number (e.g., 101=General Fund)" },
          activity_number: { description: "Activity/department number" },
          object_number: { description: "Object/account number" },
          gl_string: { description: "Full GL account string (format: FUND-ACTIVITY-OBJECT)" },
          fund_name: { description: "Fund name (e.g., 'GENERAL FUND')" },
          activity_name: { description: "Activity/department name (e.g., 'NON-DEPARTMENTAL')" },
          description: { description: "Budget line item description (e.g., 'REAL PROPERTY TAXES')" },
          amount_2004: { description: "Budget amount for year 2004", unit: "USD" },
          amount_2026: { description: "Budget amount for year 2026", unit: "USD" },
          Assumption: { description: "Budget assumption category (e.g., 'Property Tax Revenue', 'General Inflation')" },
        },
      },
    },
  },
};

/**
 * Get metadata for a specific database
 */
export function getDatabaseMetadata(dbName: string): DatabaseMetadata | undefined {
  return DATA_DICTIONARY[dbName];
}

/**
 * Get metadata for a specific table
 */
export function getTableMetadata(dbName: string, tableName: string): TableMetadata | undefined {
  return DATA_DICTIONARY[dbName]?.tables[tableName];
}

/**
 * Get metadata for a specific column
 */
export function getColumnMetadata(
  dbName: string,
  tableName: string,
  columnName: string
): ColumnMetadata | undefined {
  return DATA_DICTIONARY[dbName]?.tables[tableName]?.columns?.[columnName];
}
