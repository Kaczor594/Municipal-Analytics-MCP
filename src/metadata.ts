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
  holly_silver: {
    municipality: "Village of Holly",
    state: "Michigan",
    description:
      "Village of Holly, Michigan — consolidated query-ready data: utility billing history, multi-year budgets, rate schedules, capital assets, water production, capital improvement plan, road conditions/costs, and meter data.",
    fiscalYearConvention:
      "July 1 – June 30. 'FY2025-26' means July 2025 through June 2026.",
    currency: "USD",
    customerClassCodes: {
      RE: "Residential",
      CO: "Commercial",
      SC: "Special Contract",
      IN: "Industrial",
    },
    tableGroups: {
      "Quick Answers (Views)": {
        description: "Pre-built views that answer common questions directly. Use these before querying raw tables.",
        tables: [
          "current_rates",            // "What are the water/sewer rates?"
          "current_budget",           // "What's budgeted this year?"
          "budget_by_fund",           // "Budget by fund?"
          "water_production_summary", // "How much water do we pump?"
          "assets_summary",           // "What assets do we own?"
          "capital_projects",         // "What projects are planned?"
          "table_inventory",          // "What data is available?"
        ],
      },
      "Core Tables": {
        description: "The 10 consolidated tables in this database.",
        tables: [
          "history_register_data",     // Billing transactions (129K rows)
          "budget_final",              // Multi-year budget FY2021-2026 (669 rows)
          "rate_schedule",             // Water/sewer rate tiers (14 rows)
          "water_production",          // Daily water pumped, all years (60 rows)
          "capital_assets",            // Fixed asset register (431 rows)
          "meter_sizes_long",          // Normalized meter data (13K rows)
          "capital_improvement_plan",  // Consolidated CIP (36 rows)
          "road_segment_conditions",   // Road segment ratings (96 rows)
          "road_improvement_costs",    // Road cost line items (273 rows)
          "locationid_government_types", // Village/Township lookup (2.6K rows)
        ],
      },
    },
    tables: {
      history_register_data: {
        category: "Billing & Revenue",
        description:
          "Detailed utility billing transaction records (129,537 rows). Each row is one billing line item. Key table for revenue analysis. Dates converted from Excel serial numbers. Includes government_type (Village/Township) and simple_status (Active/Inactive) derived columns.",
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
          billed_usage: { description: "Quantity of utility consumed (REAL type)", unit: "gallons (water) or units" },
          billed_units: { description: "Number of billing units (REAL type, typically 1000-gallon increments)" },
          amount: { description: "Dollar amount charged for this line item (REAL type)", unit: "USD" },
          created: { description: "Date the transaction was created (converted from Excel serial to YYYY-MM-DD)" },
          posted: { description: "Date the transaction was posted (converted from Excel serial to YYYY-MM-DD)" },
          simple_status: {
            description: "Simplified status derived from status column",
            knownValues: { Active: "Active account", Inactive: "Any inactive status", Other: "Unclassified" },
          },
          government_type: {
            description: "Jurisdictional classification derived from parcel number",
            knownValues: { Village: "Within Village of Holly limits", Township: "In surrounding township" },
          },
        },
      },

      budget_final: {
        category: "Budgets",
        description:
          "Multi-year consolidated budget (669 rows) with amounts from FY2021 through FY2026. All 8 funds combined. Each row is one GL account line item.",
        columns: {
          account_type: {
            description: "Revenue or Expenditure (derived from GL object number: <700=Revenue, >=700=Expenditure)",
            knownValues: { Revenue: "Revenue line item", Expenditure: "Expenditure line item" },
          },
          fund_number: {
            description: "Fund number",
            knownValues: { "101": "General Fund", "202": "Major Street Fund", "203": "Local Street Fund", "401": "Capital Projects Fund", "590": "Sewer Fund", "591": "Water Fund", "592": "Refuse Fund", "593": "Lake Improvement Fund" },
          },
          department_number: { description: "Department number within the fund" },
          object_number: { description: "Object code (3-digit, determines Revenue vs Expenditure)" },
          gl_number: { description: "Full general ledger account number (format: FUND-DEPT-OBJECT)" },
          description: { description: "Line item description (e.g., 'REAL PROPERTY TAXES')" },
          amount_2021: { description: "Actual/budget amount for FY2020-21", unit: "USD" },
          amount_2022: { description: "Actual/budget amount for FY2021-22", unit: "USD" },
          amount_2023: { description: "Actual/budget amount for FY2022-23", unit: "USD" },
          amount_2024: { description: "Actual/budget amount for FY2023-24", unit: "USD" },
          amount_2025: { description: "Actual/budget amount for FY2024-25", unit: "USD" },
          amount_2026: { description: "Budget amount for FY2025-26", unit: "USD" },
        },
      },

      rate_schedule: {
        category: "Rates",
        description:
          "Water and sewer rate schedule by fiscal year (14 rows). Shows base rates and tiered usage rates per 1000 gallons.",
        columns: {
          fye_beginning: { description: "Fiscal year start date" },
          fye_ending: { description: "Fiscal year end date" },
          water: { description: "Water base rate", unit: "USD/month" },
          sewer_: { description: "Sewer base rate", unit: "USD/month" },
          base_rate: { description: "Combined base rate", unit: "USD/month" },
        },
      },

      water_production: {
        category: "Operations",
        description:
          "Daily water production data (60 rows) consolidated from FY2020-21 through FY2024-25. Monthly summaries of gallons pumped from wells.",
        columns: {
          date: { description: "Date or month label" },
          avg: { description: "Average daily production", unit: "gallons" },
          max: { description: "Maximum daily production", unit: "gallons" },
          total: { description: "Total production for period", unit: "gallons" },
          million_gallons: { description: "Total in millions of gallons", unit: "million gallons" },
          fiscal_year: { description: "Fiscal year label (e.g., '2023-2024')" },
          fye: { description: "Fiscal year ending (e.g., 2024 = FY2023-24)", unit: "year" },
        },
      },

      capital_assets: {
        category: "Capital",
        description:
          "Fixed asset register (431 rows) for Village infrastructure. Tracks acquisition, cost, depreciation, and disposals as of June 30, 2026.",
        columns: {
          section: { description: "Asset category (e.g., 'Buildings and Building Improvements', 'Equipment')" },
          asset_number: { description: "Unique asset identifier" },
          date_acquired: { description: "Date asset was acquired" },
          description: { description: "Description of the asset" },
          condition_flag: { description: "Condition flag character" },
          extended_desc: { description: "Extended description" },
          asset_type: { description: "Asset type code (e.g., B=Building)" },
          dept_number: { description: "Department code (e.g., GG=General Government, PW=Public Works, F=Fire)" },
          location: { description: "Physical location" },
          useful_life_yrs: { description: "Expected useful life", unit: "years" },
          cost_at6_30_25: { description: "Cost as of June 30, 2025", unit: "USD" },
          additions: { description: "Additions during the year", unit: "USD" },
          reclassification: { description: "Reclassification adjustments", unit: "USD" },
          disposals_beginning: { description: "Disposals from beginning cost", unit: "USD" },
          cost_at_6_30_26: { description: "Cost as of June 30, 2026", unit: "USD" },
          accumulated_depreciation_beginning: { description: "Accumulated depreciation at start of year", unit: "USD" },
          depreciation_expense: { description: "Annual depreciation expense", unit: "USD" },
          disposals_depreciation: { description: "Depreciation removed for disposals", unit: "USD" },
          accumulated_depreciation_ending: { description: "Accumulated depreciation at end of year", unit: "USD" },
          adjusted_cost_at_6_30_26: { description: "Net book value at June 30, 2026", unit: "USD" },
        },
      },

      meter_sizes_long: {
        category: "Billing & Revenue",
        description:
          "Normalized meter data (13,030 rows). One row per meter per account — unpivoted from the wide-format meter_sizes table. Includes meter reads, usage, type, size, and install dates.",
        columns: {
          location_id: { description: "Location ID linking to service address" },
          account_number: { description: "Account identifier" },
          cycle: { description: "Billing cycle" },
          route_book: { description: "Meter reading route book" },
          class: { description: "Customer class code (RE/CO/SC/IN)" },
          status: { description: "Account status" },
          parcel_number: { description: "Tax parcel number (IH- prefix = Village, I- prefix = Township)" },
          service_address: { description: "Street address" },
          record_num: { description: "Meter sequence number within account (1, 2, 3, etc.)" },
          service_name: { description: "Service type (Water, Sewer, etc.)" },
          sequence_number: { description: "Meter sequence number" },
          current_read: { description: "Current meter reading" },
          previous_read: { description: "Previous meter reading" },
          current_usage: { description: "Usage = current_read - previous_read" },
          meter_type: { description: "Meter manufacturer/type" },
          meter_size: { description: "Physical meter size (e.g., '5/8 or 3/4', '1', '2' inches)" },
          meter_id: { description: "Meter identifier" },
          serial_number: { description: "Meter serial number" },
          install_date: { description: "Meter installation date" },
        },
      },

      capital_improvement_plan: {
        category: "Capital",
        description:
          "Consolidated capital improvement plan (36 rows). Combines budget timeline projects (with fiscal year cost breakdowns) and scored/prioritized projects (with department and evaluation criteria). Use source column to distinguish.",
        columns: {
          project: { description: "Project name" },
          department: { description: "Department (e.g., STREET PROJECTS, PARKS AND RECREATION, WATER SYSTEM IMPROVEMENTS). NULL for budget_timeline rows." },
          location: { description: "Project location. NULL for project_scoring rows." },
          funding_source: { description: "Funding source (e.g., General Fund, Grants, Bonding, Water funds)" },
          anticipated_cost: { description: "Total anticipated cost", unit: "USD" },
          need: { description: "Priority level (High/Medium). NULL for budget_timeline rows." },
          fy_2025_2026: { description: "FY2025-26 cost allocation. NULL for project_scoring rows.", unit: "USD" },
          fy_2026_2027: { description: "FY2026-27 cost allocation", unit: "USD" },
          fy_2027_2028: { description: "FY2027-28 cost allocation", unit: "USD" },
          fy_2028_2029: { description: "FY2028-29 cost allocation", unit: "USD" },
          fy_2029_2030: { description: "FY2029-30 cost allocation", unit: "USD" },
          total: { description: "Total project cost", unit: "USD" },
          mandated_by_law: { description: "Yes/No — required by law or court action" },
          community_aesthetics: { description: "Yes/No — improves community aesthetics" },
          master_plan_compliance: { description: "Yes/No — complies with village master plan" },
          public_health_safety: { description: "Yes/No — addresses public health or safety threat" },
          common_resident_complaint: { description: "Yes/No — addresses common resident complaints" },
          promotes_commercial_industrial: { description: "Yes/No — promotes commercial/industrial base" },
          leverages_grants: { description: "Yes/No — leverages grant funding" },
          source: {
            description: "Source of the project record",
            knownValues: { budget_timeline: "From CIP budget timeline (has fiscal year cost breakdowns)", project_scoring: "From CIP scoring matrix (has department and evaluation criteria)" },
          },
        },
      },

      road_segment_conditions: {
        category: "Infrastructure",
        description:
          "Road segment condition survey (96 rows). Each row is one road segment with condition rating, remaining service life, surface type, and proposed treatment.",
        columns: {
          segment_name: { description: "Street/road name" },
          from_description: { description: "Segment start point" },
          to_description: { description: "Segment end point" },
          length_miles: { description: "Segment length", unit: "miles" },
          width_ft: { description: "Road width", unit: "feet" },
          nfc: { description: "National Functional Classification (Local, Unk, etc.)" },
          legal_system: { description: "Legal road system (CtyMajSt, CtyMinSt, Undef)" },
          surface_subtype: { description: "Surface type (Asphalt-Standard, etc.)" },
          current_rating: { description: "PASER condition rating (1-10 scale, higher=better)" },
          remaining_service_life: { description: "Remaining service life (negative = past due)", unit: "years" },
          proposed_treatment: { description: "Recommended treatment (Reconstruct, Mill and Resurface, etc.)" },
          estimated_cost: { description: "Estimated treatment cost", unit: "USD" },
        },
      },

      road_improvement_costs: {
        category: "Infrastructure",
        description:
          "Road improvement line-item cost breakdown (273 rows). Multiple rows per road section showing individual cost components. Linked to road_segment_conditions by segment_name.",
        columns: {
          segment_name: { description: "Street/road name (matches road_segment_conditions.segment_name)" },
          section: { description: "Section description with cross-streets (e.g., '(martha to maple)')" },
          item: { description: "Cost item type (e.g., Reconstruct, ADA Ramps, Storm Sewer, street name for subtotal)" },
          length_miles: { description: "Item length", unit: "miles" },
          item_length_ft: { description: "Item length in feet", unit: "feet" },
          item_cost: { description: "Unit cost for this item", unit: "USD" },
          original_new_estimate: { description: "Whether this is an 'original estimate' or 'new estimate'" },
          cost: { description: "Total cost for this line item", unit: "USD" },
        },
      },

      locationid_government_types: {
        category: "Reference",
        description:
          "Maps location IDs to government type (Village or Township). 2,608 rows. Used for JOINs to classify accounts by jurisdiction.",
        columns: {
          location_id: { description: "Full location ID" },
          location_id_abbr: { description: "Abbreviated location ID (without suffix)" },
          government_type: {
            description: "Jurisdiction classification",
            knownValues: { Village: "Within Village of Holly limits", Township: "In surrounding township" },
          },
        },
      },

      // --- Views ---
      current_rates: {
        category: "Views",
        description: "VIEW: Current water and sewer rates (most recent fiscal year only).",
      },
      rate_history: {
        category: "Views",
        description: "VIEW: All water and sewer rates over time, ordered by most recent first.",
      },
      current_budget: {
        category: "Views",
        description: "VIEW: Current year (FY2025-26) budget with prior year comparison.",
        columns: {
          current_year_budget: { description: "FY2025-26 budget amount", unit: "USD" },
          prior_year_actual: { description: "FY2024-25 actual amount", unit: "USD" },
          change_from_prior: { description: "Difference from prior year", unit: "USD" },
        },
      },
      budget_by_fund: {
        category: "Views",
        description: "VIEW: Budget totals by fund and account type across FY2021-2026.",
      },
      water_production_summary: {
        category: "Views",
        description: "VIEW: Annual water production summary with totals and averages by fiscal year.",
      },
      assets_summary: {
        category: "Views",
        description: "VIEW: Capital assets summarized by category with total cost, depreciation, and net book value.",
      },
      capital_projects: {
        category: "Views",
        description: "VIEW: Alias for capital_improvement_plan. All CIP projects.",
      },
      table_inventory: {
        category: "Views",
        description: "VIEW: Master list of tables with descriptions and natural language triggers.",
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

  cadillac: {
    municipality: "City of Cadillac",
    state: "Michigan",
    description:
      "City of Cadillac, Michigan — water and sewer utility billing detail. Contains line-item billing records for all metered and flat-rate water and sewer accounts, July 2024 through June 2025.",
    fiscalYearConvention:
      "July 1 – June 30. Data spans approximately FY2024-25 (posted dates are Excel serial numbers: 45475 = 2024-07-02, 45838 = 2025-06-30).",
    currency: "USD",
    customerClassCodes: {
      RRO: "Residential – Regular Owner",
      ROO: "Residential – Owner Occupied (alternate)",
      ROOE: "Residential – Owner Occupied (exempt/elderly)",
      RROE: "Residential – Regular Owner (exempt/elderly)",
      COM: "Commercial",
      IND: "Industrial",
      INS: "Institutional",
    },
    tables: {
      water_detail: {
        description:
          "Water billing line items. Each row is one charge line on a water bill. Contains metered usage charges (bill_item_name starting with 'W') and irrigation charges ('I'). 88,119 rows.",
        columns: {
          account_number: {
            description: "Customer account number (e.g., '5151700-008').",
          },
          locationid: {
            description:
              "Location identifier in format STREET-NUMBER-UNIT (e.g., 'MARB-000330-0000-08').",
          },
          service_address: {
            description: "Service address (street address).",
          },
          name: {
            description: "Customer name on the account.",
          },
          cycle: {
            description:
              "Billing cycle description. Typically 'Monthly Utility Bill'.",
          },
          section: {
            description: "Billing section (often blank).",
          },
          route: {
            description:
              "Meter reading route (e.g., 'Route 3', 'Route 5').",
          },
          class: {
            description:
              "Customer class code. Known values: RRO, ROO, COM, INS, ROOE, IND, RROE.",
          },
          status: {
            description:
              "Account status. Known values: Active, Inactive-Paid, Inactive-Balance Due, Inactive-Credit, INACTIVE-TURNED OFF, INACTIVE-SEASONAL, INACTIVE-DELINQUENT, INACTIVE-CONDENMED.",
          },
          usage: {
            description:
              "Usage indicator. Typically 'Usage' for metered consumption lines.",
          },
          bill_item_name: {
            description:
              "Rate schedule item. Water meters: W1 (5/8\"), W2 (3/4\"), W3 (1\"), W4 (1-1/2\"), W5 (2\"), W6 (3\"), W7 (4\"), W8 (6\"), W9 (8\"). Irrigation meters: I1-I5. Suffix 'RTS' = ready-to-serve (fixed charge); 'Meter' = volumetric charge. 'W: Flat Rate' = flat-rate water.",
          },
          trx_type: {
            description: "Transaction type. All rows are 'Billing'.",
          },
          trx_type_detail: {
            description:
              "Transaction detail. All rows are 'Bill Calculated'.",
          },
          rate: {
            description:
              "Rate schedule name corresponding to bill_item_name (e.g., 'W1: 5/8\" Meter Rate').",
          },
          billed_usage: {
            description:
              "Billed consumption quantity (TEXT). For volumetric lines this is gallons or units consumed; for RTS lines this is 0.",
          },
          billed_units: {
            description:
              "Number of billing units (TEXT). Typically 1.",
          },
          amount: {
            description:
              "Dollar amount charged for this line item (TEXT).",
          },
          created: {
            description:
              "Bill creation timestamp as Excel serial number (e.g., 45475.34 ≈ 2024-07-02).",
          },
          posted: {
            description:
              "Bill posted date as Excel serial number (integer). Range: 45475 (2024-07-02) to 45838 (2025-06-30).",
          },
        },
      },
      sewer_detail: {
        description:
          "Sewer billing line items. Same structure as water_detail but for sewer charges. Bill items start with 'S' for sewer, 'S99' for LMSA (Lake Mitchell Sewer Authority) charges. Includes flat-rate sewer items. 86,679 rows. Has additional 'usage' column (INTEGER) not present in water_detail.",
        columns: {
          account_number: { description: "Customer account number." },
          locationid: { description: "Location identifier." },
          service_address: { description: "Service address." },
          name: { description: "Customer name." },
          cycle: { description: "Billing cycle description." },
          section: { description: "Billing section." },
          route: { description: "Meter reading route." },
          class: { description: "Customer class code." },
          status: { description: "Account status." },
          bill_item_name: {
            description:
              "Sewer rate schedule item. S1-S8 by meter size. 'S99: LMSA' = Lake Mitchell Sewer Authority charges. Flat Rate items for unmetered sewer.",
          },
          trx_type: { description: "Transaction type ('Billing')." },
          trx_type_detail: {
            description: "Transaction detail ('Bill Calculated').",
          },
          rate: { description: "Rate schedule name." },
          billed_usage: { description: "Billed consumption quantity." },
          billed_units: { description: "Number of billing units." },
          amount: { description: "Dollar amount charged." },
          created: {
            description: "Bill creation timestamp (Excel serial number).",
          },
          posted: {
            description: "Bill posted date (Excel serial number).",
          },
          usage: {
            description:
              "Usage quantity (INTEGER). Additional column not in water_detail.",
          },
        },
      },
      utility_detail: {
        description:
          "Combined water and sewer billing detail. Union of water_detail and sewer_detail with an additional 'utility_type' column identifying the service. Numeric columns (billed_usage, billed_units, amount) are REAL type here vs TEXT in the individual tables. 174,798 rows.",
        columns: {
          account_number: { description: "Customer account number." },
          locationid: { description: "Location identifier." },
          service_address: { description: "Service address." },
          name: { description: "Customer name." },
          cycle: { description: "Billing cycle description." },
          section: { description: "Billing section." },
          route: { description: "Meter reading route." },
          class: { description: "Customer class code." },
          status: { description: "Account status." },
          usage: { description: "Usage indicator." },
          bill_item_name: {
            description:
              "Rate schedule item (water W-prefix or sewer S-prefix).",
          },
          trx_type: { description: "Transaction type ('Billing')." },
          trx_type_detail: {
            description: "Transaction detail ('Bill Calculated').",
          },
          rate: { description: "Rate schedule name." },
          billed_usage: {
            description: "Billed consumption quantity (REAL).",
          },
          billed_units: {
            description: "Number of billing units (REAL).",
          },
          amount: { description: "Dollar amount charged (REAL)." },
          created: {
            description: "Bill creation timestamp (Excel serial number).",
          },
          posted: {
            description: "Bill posted date (Excel serial number).",
          },
          utility_type: {
            description:
              "Service type: 'water' or 'sewer'. Distinguishes which service the row belongs to.",
          },
        },
      },
    },
  },

  norton_shores: {
    municipality: "City of Norton Shores",
    state: "Michigan",
    description:
      "City of Norton Shores, Michigan — water/sewer/irrigation billing data including commodity charges, debt charges, fees, and miscellaneous items. Contains FY2022-23 through FY2024-25 billing history.",
    fiscalYearConvention:
      "July 1 – June 30. 'FY2022-23' means July 2022 through June 2023. The fiscal_year column in history_register_data identifies the source fiscal year.",
    currency: "USD",
    customerClassCodes: {
      RE: "Residential",
      CO: "Commercial",
      GO: "Government",
      IN: "Industrial",
      CH: "Church/Non-Profit",
      SC: "Special Contract",
    },
    tables: {
      water_billing: {
        description:
          "Utility billing transaction records for all Norton Shores water/sewer accounts. Each row is one billing line item. Key table for revenue, usage, and customer analysis.",
        columns: {
          account_number: { description: "Unique account identifier" },
          locationid: { description: "Location ID linking to physical service address" },
          service_address: { description: "Street address receiving utility service" },
          name: { description: "Account holder name" },
          cycle: { description: "Billing cycle number" },
          section: { description: "Billing section" },
          route: { description: "Meter reading route" },
          class: {
            description: "Customer class code",
            knownValues: {
              RE: "Residential",
              CO: "Commercial",
              GO: "Government",
              IN: "Industrial",
              CH: "Church/Non-Profit",
              SC: "Special Contract",
            },
          },
          status: { description: "Account status (e.g., Active, Final)" },
          bill_item_name: {
            description: "Type of commodity charge on the bill",
            knownValues: {
              "WATER COMMODITY": "Water usage charge",
              "SEWER COMMODITY": "Sewer usage charge",
              "IRRIG COMMODITY": "Irrigation usage charge",
            },
          },
          trx_type: { description: "Transaction type (e.g., Bill, Adjustment)" },
          trx_type_detail: { description: "Detailed transaction category" },
          rate: { description: "Rate code applied to this charge" },
          billed_usage: { description: "Quantity of utility consumed", unit: "gallons or units" },
          billed_units: { description: "Number of billing units" },
          amount: { description: "Dollar amount charged for this line item", unit: "USD" },
          created: { description: "Date the transaction was created" },
          posted: { description: "Date the transaction was posted" },
        },
      },
      history_register_data: {
        description:
          "Full billing history register for FY2022-23 through FY2024-25 (476K+ rows). Includes all charge types: commodity charges, debt charges, fees, service calls, and miscellaneous. PREFERRED table for comprehensive billing analysis.",
        columns: {
          account_number: { description: "Unique account identifier" },
          locationid: { description: "Location ID linking to physical service address" },
          service_address: { description: "Street address receiving utility service" },
          name: { description: "Account holder name" },
          cycle: { description: "Billing cycle name (e.g., 'E BROADWAY', 'MCCRACKEN')" },
          section: { description: "Billing section number" },
          route: { description: "Meter reading route number" },
          class: {
            description: "Customer class code",
            knownValues: {
              RE: "Residential",
              CO: "Commercial",
              GO: "Government",
              IN: "Industrial",
              CH: "Church/Non-Profit",
              SC: "Special Contract",
            },
          },
          status: {
            description: "Account status",
            knownValues: {
              "Active": "Active account",
              "Final Bill": "Final bill issued",
              "ACTIVE-CURB STOP OFF": "Active but curb stop is off",
              "ACTIVE-METER PULLED": "Active but meter pulled",
              "Inactive-Balance Due": "Inactive with outstanding balance",
              "Inactive-Credit": "Inactive with credit balance",
              "Inactive-Paid": "Inactive, fully paid",
            },
          },
          bill_item_name: {
            description: "Type of charge on the bill",
            knownValues: {
              "WATER COMMODITY": "Water usage charge",
              "SEWER COMMODITY": "Sewer usage charge",
              "IRRIG COMMODITY": "Irrigation usage charge",
              "WATER DEBT": "Water infrastructure debt charge",
              "SEWER DEBT": "Sewer infrastructure debt charge",
              "IRRIG DEBT": "Irrigation infrastructure debt charge",
              "Water Debt 2": "Additional water debt charge",
              "FIRE HYD MAINT FEE": "Fire hydrant maintenance fee",
              "FIRE HYDRANT USAGE": "Fire hydrant usage charge",
              "TURN ON": "Service turn-on fee",
              "Del. turn on fee": "Delinquent turn-on fee",
              "AFTER HRS SERV CALL": "After-hours service call fee",
              "CURB STOP REPAIR": "Curb stop repair charge",
              "WATER METER REPAIR": "Water meter repair charge",
              "Returned payment": "Returned payment fee",
              "Unauthorized Use": "Unauthorized use charge",
              "MISC": "Miscellaneous charge",
            },
          },
          trx_type: { description: "Transaction type (all records are 'Billing')" },
          trx_type_detail: { description: "Detailed transaction category (e.g., 'Bill Calculated')" },
          rate: { description: "Rate code applied to this charge" },
          billed_usage: { description: "Quantity of utility consumed", unit: "gallons or units" },
          billed_units: { description: "Number of billing units" },
          amount: { description: "Dollar amount charged for this line item", unit: "USD" },
          created: { description: "Date/time the transaction was created (ISO format)" },
          posted: { description: "Date the transaction was posted (ISO format)" },
          fiscal_year: {
            description: "Fiscal year the record belongs to",
            knownValues: {
              "FY2022-23": "July 2022 – June 2023",
              "FY2023-24": "July 2023 – June 2024",
              "FY2024-25": "July 2024 – June 2025",
            },
          },
        },
      },
    },
  },

  web_water: {
    municipality: "WEB Water",
    state: "Michigan",
    description:
      "WEB Water — detailed billing distribution data including meter reads, charges, usage/base charge splits, rate codes, and service detail. FY2024 data (periods 202310–202409).",
    fiscalYearConvention:
      "Period column uses YYYYMM format (e.g., 202310 = October 2023). Year and month columns are also available separately.",
    currency: "USD",
    customerClassCodes: {},
    tables: {
      billing_detail: {
        description:
          "Detailed billing distribution records (204K+ rows). Each row is one billing line item with meter read details, charges broken into usage and base components, and rate/revenue codes.",
        columns: {
          account: { description: "Account number identifier" },
          period: { description: "Billing period in YYYYMM format (e.g., 202310 = October 2023)" },
          rate: { description: "Rate code (e.g., '08')" },
          revenue_code: { description: "Revenue classification code (e.g., 'D')" },
          balance_category: { description: "Balance category (e.g., 'WTR' for water)" },
          service_offered: { description: "Service offered code (numeric)" },
          statement_date: { description: "Statement date (ISO format)" },
          type: { description: "Record type code (e.g., 'R')" },
          loc_id: { description: "Location ID" },
          svc_id: { description: "Service ID" },
          seq: { description: "Sequence number" },
          noda: { description: "Number of days (billing period length)" },
          read_code: { description: "Meter read code (A=Actual, M=Manual, S=System, E=Estimated)" },
          read_date: { description: "Date the meter was read (ISO format)" },
          meter: { description: "Meter serial number" },
          grp: { description: "Group code (numeric)" },
          register_type: { description: "Register type (e.g., 'GAL' for gallons)" },
          multiplier: { description: "Meter read multiplier" },
          metered_units: { description: "Metered consumption units" },
          billed_units: { description: "Units billed to the customer" },
          charges: { description: "Total charges for this line item", unit: "USD" },
          tax: { description: "Tax amount", unit: "USD" },
          rate_rev_code: { description: "Combined rate and revenue code (e.g., 'D-08')" },
          year: { description: "Billing year extracted from period" },
          month: { description: "Billing month extracted from period" },
          usage_charge: { description: "Usage-based portion of charges (non-zero when register_type is present)", unit: "USD" },
          base_charge: { description: "Base/fixed portion of charges (non-zero when register_type is absent)", unit: "USD" },
          frequency: { description: "Billing frequency (e.g., 'Monthly')" },
          units: { description: "Number of units (typically 1)" },
        },
      },
      capex: {
        description:
          "Capital expenditure budget projections (FY2019–FY2044). Unpivoted from wide format — one row per line item per year. Source: FY2026 Board-Approved Operations Budget.",
        columns: {
          id: { description: "Line item identifier (e.g., '1', '1a', '2')" },
          item_descriptor: { description: "Description of the capital expenditure item" },
          category: { description: "Capital expenditure category (e.g., 'Capital Improvements')" },
          inflation: { description: "Assumed annual inflation rate (e.g., '0.00%', '3.00%')" },
          year: { description: "Fiscal year (2019–2044)" },
          amount: { description: "Projected expenditure amount for this year", unit: "USD" },
        },
      },
      opex: {
        description:
          "Operating expenditure budget projections (FY2019–FY2044). Unpivoted from wide format — one row per line item per year. Source: FY2026 Board-Approved Operations Budget.",
        columns: {
          id: { description: "Line item identifier" },
          item_descriptor: { description: "GL account code and description (e.g., '60100 INTAKE EXPENSE - LABOR')" },
          category: { description: "Operating expense category (e.g., 'Other Water Treatment', 'Other Admin')" },
          inflation: { description: "Assumed annual inflation rate" },
          variability: { description: "Cost variability percentage (e.g., '0%' = fixed cost)" },
          year: { description: "Fiscal year (2019–2044)" },
          amount: { description: "Projected operating expenditure for this year", unit: "USD" },
        },
      },
      debt: {
        description:
          "Debt service schedule for current and proposed obligations (FY2019–FY2044). Combined from 'Current' and 'Proposed' sheets. Unpivoted — one row per debt instrument per year. Source: FY2026 Board-Approved Operations Budget.",
        columns: {
          id: { description: "Debt instrument identifier" },
          item_descriptor: { description: "Description of the debt instrument (e.g., 'CoBank Mina Tank T01')" },
          category: {
            description: "Debt status category",
            knownValues: {
              "Current": "Existing debt obligation",
              "Proposed": "Planned new debt",
              "Proposed (Defer pmt yr1)": "Planned debt with first-year payment deferral",
            },
          },
          issue_year: { description: "Year the debt was or will be issued (null for existing pre-model debt)" },
          amort_period: { description: "Amortization period in years (null for existing pre-model debt)" },
          principal_amount: { description: "Original principal amount (null for existing pre-model debt)", unit: "USD" },
          interest_rate: { description: "Annual interest rate (e.g., '4.350%')" },
          year: { description: "Fiscal year (2019–2044)" },
          amount: { description: "Annual debt service payment for this year", unit: "USD" },
        },
      },
      revenue: {
        description:
          "Revenue projections (FY2019–FY2044). Unpivoted from wide format — one row per revenue line item per year. Source: FY2026 Board-Approved Operations Budget.",
        columns: {
          id: { description: "Line item identifier" },
          item_descriptor: { description: "GL account code and description (e.g., '46100 WATER SALES - MINIMUM REVENUE')" },
          category: { description: "Revenue category (e.g., 'WEB Water Sales - Minimum Charge', 'Other Operating Revenue')" },
          in_debt_svc_cov: { description: "Whether this revenue is included in debt service coverage calculations ('yes' or 'no')" },
          year: { description: "Fiscal year (2019–2044)" },
          amount: { description: "Projected revenue amount for this year", unit: "USD" },
        },
      },
      billing_fy2025: {
        description:
          "Muniworth-formatted billing data for FY2025 (205K+ rows). Account-level billing records with consumption, charges split into fixed and variable components, meter sizes, and billing multipliers (SFE). Periods 1–12 correspond to months within the fiscal year.",
        columns: {
          customer_id: { description: "Customer/account identifier" },
          customer_category: { description: "Customer category code (e.g., 'F-73', 'A-01', 'D-08'). Encodes rate class and area." },
          frequency: { description: "Billing frequency (e.g., 'Monthly')" },
          year: { description: "Fiscal year (e.g., 2025)" },
          period: { description: "Billing period within the fiscal year (1–12)" },
          consumption: { description: "Water consumption in US gallons (USG)" },
          total_billed: { description: "Total amount billed for this period", unit: "USD" },
          billing_multiplier_sfe: { description: "Billing multiplier / Single Family Equivalent (SFE) factor" },
          meter_size: { description: "Meter size (e.g., '5/8 - 3/4', '1', '1 1/2', '2', '3', '4', '6')" },
          fixed_charge: { description: "Fixed/base charge component of the bill", unit: "USD" },
          variable_charge: { description: "Variable/usage-based charge component of the bill", unit: "USD" },
          meter_read_date: { description: "Date the meter was read (ISO format, converted from Excel serial)" },
        },
      },
    },
  },

  mi_f65: {
    municipality: "~1,455 Michigan local government units",
    state: "Michigan",
    description:
      "Michigan F-65 Annual Financial Report data. Standardized financial reporting submitted by local government units (cities, villages, townships) to the Michigan Department of Treasury. Contains revenue, expenditures, balance sheet, and other financing data. Source: data.michigan.gov Socrata API.",
    fiscalYearConvention:
      "Fiscal year ending. The 'fy' column contains the fiscal year (e.g., 2023). Most Michigan municipalities use a July 1 – June 30 fiscal year, but some use calendar year or other end dates. The 'fiscalendmonth' column indicates the fiscal year end month.",
    currency: "USD",
    customerClassCodes: {},
    tables: {
      dashboard_metrics: {
        description:
          "Pre-computed financial health indicators from the Michigan Community Financial Dashboard (2010-2026, 459K rows). Contains 21 derived metrics (revenue, expenditure, debt, pension, ratios) for all Michigan local government units across 16 years. Use this table for trend analysis, multi-year comparisons, and financial health assessments. For detailed line-item data, use f65_financial_data instead.",
        columns: {
          socrata_id: {
            description: "Socrata geographic ID (Census FIPS-based, e.g., '0600000US2602760900'). Not needed for most queries.",
          },
          name: {
            description: "Municipality name in uppercase (e.g., 'ONTWA TOWNSHIP', 'CITY OF ROCKFORD'). Use LIKE for searching.",
          },
          type: {
            description: "Unit type in lowercase.",
            knownValues: {
              township: "Township",
              city: "City",
              village: "Village",
              county: "County",
            },
          },
          year: {
            description: "Year of the metric (2010–2026).",
          },
          variable: {
            description: "Machine-readable metric identifier. Use this in WHERE clauses.",
            knownValues: {
              population: "Population",
              total_taxable_value: "Total Taxable Value",
              property_tax_health: "Total Taxable Value Per Capita",
              total_general_fund_revenue: "Total General Fund Revenue",
              total_general_fund_revenues: "Total General Fund Revenue (duplicate key)",
              total_general_fund_expenditures: "Total General Fund Expenditure",
              revenue_surplus: "Revenue Surplus (Deficit) — negative = deficit",
              general_fund_unrestricted_balance: "General Fund Unrestricted Balance",
              general_fund_health: "General Fund Balance Per Capita",
              general_fund_ratio: "General Fund Ratio (balance / expenditures)",
              general_fund_cash_Ratio: "General Fund Cash Ratio",
              liquidity_ratio: "Liquidity Ratio",
              governmental_net_position_ratio: "Governmental Net Position Ratio",
              debt_long_term: "Total Long Term Debt",
              debt_service: "Debt Service (annual payments)",
              debt_health: "Debt Per Capita",
              debt_taxable_value: "Debt as % of Taxable Value",
              long_term_debt_revenue: "Long Term Debt to Revenue Ratio",
              unfunded_pension_liability: "Unfunded Pension Liability",
              pension_health: "Unfunded Pension Liability Per Capita",
              extraordinary: "Extraordinary/Special Items",
            },
          },
          analytics_desc: {
            description: "Human-readable metric name (e.g., 'Total General Fund Revenue', 'Debt Per Capita').",
          },
          value: {
            description: "The metric value. Units depend on the variable — USD for dollar amounts, ratio for ratios, count for population.",
            unit: "varies by metric",
          },
          local_unit_id: {
            description: "Dashboard internal ID for the local unit.",
          },
          municode: {
            description: "Michigan Treasury municipal code. Links to f65_financial_data.municode for cross-table queries.",
          },
          entity_type: {
            description: "Unit type in uppercase.",
            knownValues: {
              CITY: "City (~83K rows)",
              TOWNSHIP: "Township (~284K rows)",
              VILLAGE: "Village (~66K rows)",
              COUNTY: "County (~24K rows)",
              "ISD District": "Intermediate School District (~300 rows)",
              "LEA District": "Local Education Agency (~970 rows)",
            },
          },
          county_name: {
            description: "County where the municipality is located (e.g., 'Oakland County', 'Kent County').",
          },
          gazetteer_name: {
            description: "Census gazetteer geographic name.",
          },
          row_id: {
            description: "Composite key: variable + socrata_id + year. Unique per row.",
          },
        },
      },
      f65_financial_data: {
        description:
          "Detailed F-65 line-item financial data (~212K rows, FY2025 only). Each row is one financial line item for one municipality in one fiscal year. IMPORTANT: This table requires careful filtering — always specify a category, and be aware of the fund_group column to avoid mixing actual vs budget figures or double-counting across fund types. For multi-year trends, use dashboard_metrics instead.",
        columns: {
          id: {
            description: "Auto-increment primary key. Not meaningful for analysis.",
          },
          municode: {
            description: "Michigan Treasury municipal code. Unique identifier assigned by the state to each local government unit. Not the same as FIPS codes.",
          },
          lu_name: {
            description: "Local unit name (e.g., 'Holly Village', 'Rockford City', 'Rose Township'). Includes the unit type suffix in most cases.",
          },
          lu_nametype: {
            description: "Local unit type classification.",
            knownValues: {
              City: "Incorporated city (~240 units)",
              Village: "Incorporated village (~204 units)",
              Township: "Township (~1,010 units)",
              County: "County (~1 unit in current data)",
            },
          },
          fy: {
            description: "Fiscal year (e.g., 2023). Represents the year the fiscal period ends.",
          },
          field_name: {
            description: "F-65 form cell reference in T{table}R{row}C{column} format. T=category (1=Revenue, 2=Expenditure, 3=Balance Sheet, 4=Other Financing). R=line item number. C=fund column (2=General Fund, 3=All Other Governmental, 5=Component Units, 6=Government-Wide, 7=Total cross-fund sum). Primarily useful for cross-referencing the official F-65 PDF form.",
          },
          category: {
            description: "REQUIRED FILTER. Financial statement category.",
            knownValues: {
              Revenue: "Tax revenue, intergovernmental, charges for services, fines, interest, etc.",
              Expenditure: "General government, public safety, public works, recreation, debt service, capital outlay, etc.",
              "Balance Sheet": "Assets, liabilities, and fund equity at fiscal year end.",
              "Other Financing": "Transfers in/out, bond proceeds, and other non-operating items.",
            },
          },
          fund_group: {
            description: "Fund classification. Critical for correct analysis — distinguishes actual vs budget and different fund scopes.",
            knownValues: {
              "General Fund": "Actual general fund figures (primary operating fund)",
              "General Fund Final Amended Budget": "Budgeted general fund figures (for budget-to-actual comparison)",
              "All Other Governmental Funds": "Actuals for special revenue, debt service, capital projects, and other governmental funds",
              "All Other Governmental Funds Final Amended Budget": "Budget for non-general governmental funds",
              "Component Units": "Separate legal entities (authorities, commissions, special districts)",
              "Government-Wide": "Government-wide financial statement figures (accrual basis, not by fund). From standalone C6 rows in the F-65 form.",
            },
          },
          description: {
            description: "Line item description (e.g., 'Property Taxes', 'Police', 'Total Expenditures'). These are standardized across all municipalities by the F-65 form structure.",
          },
          account_number: {
            description: "Account number from the F-65 form. May be null for some line items.",
          },
          notes: {
            description: "Row type indicator. Important for filtering.",
            knownValues: {
              Number: "Actual reported numeric values. DEFAULT — use these for most queries.",
              "Summary - Number": "Derived calculations (fund balances, net changes, totals). Include these when you need calculated subtotals or fund balance figures.",
            },
          },
          field_data: {
            description: "The financial value. Stored as text but represents USD amounts. Use CAST(field_data AS REAL) for aggregation. May be '0' or null.",
            unit: "USD (stored as text)",
          },
          fiscalendmonth: {
            description: "Month number when the fiscal year ends (e.g., 6 = June, 12 = December). Most Michigan municipalities end in June (6).",
          },
          source_dataset: {
            description: "Which Socrata dataset this row came from (county, city, village, township_part1, township_part2).",
          },
        },
      },
      millage_rates: {
        description:
          "Michigan property tax millage rates (28,174 rows across 2 tax years: 2024 and 2026, from 6 source sheets each). Covers ALL taxing jurisdictions statewide — not just local units but also school districts, ISDs, community colleges, authorities, and special assessments. Data is from 6 separate worksheets in the Michigan Treasury MillageSearch file, all unified into this single table with the sheet_source column indicating origin. Multi-column rate sheets are unpivoted: School Districts have 6 rows per district (HoldHarmless, NonHomestead, Debt, SinkingFund, CommPers, Recreational), ISDs have 5, etc. Use the query_millage_rates tool for guided access. Use the tax_year column to filter by year or compare rates across years. Row counts per year ~14K: Local Unit (~5,630), School (~5,800), ISD (1,380), Authority (~830), Special Assessment (~255), Community College (~174). Source: Michigan Department of Treasury State Equalization e-filing system (eequal.bsasoftware.com).",
        category: "Property Tax & Millage",
        columns: {
          county_name: {
            description: "County name (e.g., 'Washtenaw', 'Oakland', 'Wayne'). All 83 Michigan counties represented.",
          },
          entity_code: {
            description: "Michigan local unit code (e.g., '810020'). NULL for Authority entities. Matches the coding used in the State Equalization system.",
          },
          entity_name: {
            description: "Name of the taxing entity (e.g., 'Ann Arbor', 'ALLEGAN', 'LIBRARY - ANN ARBOR DIST.', 'ANN ARBOR PUBLIC SCHOOLS').",
          },
          entity_type: {
            description: "Type of taxing entity.",
            knownValues: {
              County: "County government levies",
              City: "Incorporated city levies",
              Township: "Township levies",
              Village: "Incorporated village levies",
              "School District": "K-12 school district levies (6 rate types each)",
              ISD: "Intermediate School District levies (5 rate types each)",
              "Community College": "Community college district levies (Operating + Debt)",
              Authority: "Special authorities — libraries, transit, DDA, fire, EMS, etc.",
              "Special Assessment": "Special assessment districts (fire, EMS, etc.)",
            },
          },
          millage_category: {
            description: "The specific levy purpose. Values vary by entity_type. For local units: ALLOC/CHARTER, POLICE, FIRE, PARKS/REC, LIBRARY, ROADS, etc. (226 unique values). For School Districts: HoldHarmless, NonHomestead, Debt, SinkingFund, CommPers, Recreational. For ISDs: Allocated, Vocational, SpecialEd, Debt, Enhancement. For Authorities/Community Colleges: Operating, Debt.",
          },
          millage_rate: {
            description: "Tax rate in mills (dollars per $1,000 of taxable value). For example, 18.0 mills means $18 per $1,000 of taxable value.",
            unit: "mills",
          },
          tax_year: {
            description: "Tax year. Available years: 2024, 2026. Use this to filter by year or compare rates across years.",
          },
          sheet_source: {
            description: "Original worksheet the data came from in the source XLS file.",
            knownValues: {
              "Local Unit": "County, City, Township, Village levies",
              School: "K-12 school district levies",
              ISD: "Intermediate School District levies",
              "Community College": "Community college levies",
              Authority: "Library, transit, DDA, fire, EMS, and other authority levies",
              "Special Assessment": "Special assessment district levies",
            },
          },
        },
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
