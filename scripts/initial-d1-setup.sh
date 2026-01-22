#!/bin/bash

# Municipal Analytics - D1 Database Initial Setup Script
# This script creates D1 databases and uploads initial data
#
# Prerequisites:
# - Wrangler CLI installed (npm install -g wrangler)
# - Logged into Cloudflare (wrangler login)
# - Database files available in specified paths

set -e  # Exit on error

echo "=========================================="
echo "Municipal Analytics D1 Setup"
echo "=========================================="
echo ""

# Configuration - UPDATE THESE PATHS
DB_SOURCE_DIR="${DB_SOURCE_DIR:-../../databases}"
HOLLY_DB="${DB_SOURCE_DIR}/Holly_data_bronze.db"
ROCKFORD_DB="${DB_SOURCE_DIR}/Rockford.db"
HISTORICAL_DB="${DB_SOURCE_DIR}/historical_budgets.db"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo -e "${RED}Error: Wrangler CLI not found${NC}"
    echo "Install with: npm install -g wrangler"
    exit 1
fi

# Check if logged in
echo "Checking Cloudflare authentication..."
if ! wrangler whoami &> /dev/null; then
    echo -e "${YELLOW}Not logged in. Running wrangler login...${NC}"
    wrangler login
fi

echo -e "${GREEN}Authenticated with Cloudflare${NC}"
echo ""

# Function to create a D1 database
create_database() {
    local db_name=$1
    echo "Creating D1 database: $db_name"

    # Check if database already exists
    if wrangler d1 list 2>/dev/null | grep -q "$db_name"; then
        echo -e "${YELLOW}Database '$db_name' already exists${NC}"
    else
        wrangler d1 create "$db_name"
        echo -e "${GREEN}Created database: $db_name${NC}"
    fi
}

# Function to upload database - D1 compatible version
upload_database() {
    local d1_name=$1
    local source_file=$2

    echo ""
    echo "Uploading $source_file to $d1_name..."

    if [ ! -f "$source_file" ]; then
        echo -e "${RED}Error: Source file not found: $source_file${NC}"
        return 1
    fi

    local temp_file="/tmp/${d1_name}_dump.sql"

    # Export to SQL and remove transaction statements that D1 doesn't support
    echo "Exporting database to D1-compatible SQL..."
    sqlite3 "$source_file" .dump | \
        grep -v "^BEGIN TRANSACTION" | \
        grep -v "^COMMIT" | \
        grep -v "^ROLLBACK" | \
        grep -v "^SAVEPOINT" | \
        grep -v "^RELEASE" > "$temp_file"

    # Get file size for progress indication
    local file_size=$(wc -c < "$temp_file" | tr -d ' ')
    echo "SQL file size: $(( file_size / 1024 )) KB"

    echo "Uploading to D1 (this may take a while for large databases)..."

    # Upload with batch size to handle large files
    if wrangler d1 execute "$d1_name" --remote --file="$temp_file" --batch-size=1000; then
        echo -e "${GREEN}Successfully uploaded $source_file to $d1_name${NC}"
    else
        echo -e "${RED}Upload failed. Trying smaller batch size...${NC}"
        # Retry with smaller batch size
        wrangler d1 execute "$d1_name" --remote --file="$temp_file" --batch-size=100
    fi

    # Cleanup
    rm "$temp_file"
}

# Main setup
echo "Step 1: Checking D1 Databases"
echo "------------------------------"

# List existing databases
echo "Existing D1 databases:"
wrangler d1 list

echo ""
echo "Step 2: Uploading Database Files"
echo "---------------------------------"
echo ""
echo "Source directory: $DB_SOURCE_DIR"
echo ""

# Check source files exist
if [ ! -d "$DB_SOURCE_DIR" ]; then
    echo -e "${RED}Error: Database source directory not found: $DB_SOURCE_DIR${NC}"
    echo "Set DB_SOURCE_DIR environment variable to your database directory"
    echo "Example: DB_SOURCE_DIR=/path/to/databases ./initial-d1-setup.sh"
    exit 1
fi

# Show available files
echo "Available database files:"
ls -la "$DB_SOURCE_DIR"/*.db 2>/dev/null || echo "No .db files found"
echo ""

# Ask user which databases to upload
echo "Which databases do you want to upload?"
echo "1) Holly (Holly_data_bronze.db)"
echo "2) Rockford (Rockford.db)"
echo "3) Historical Budgets (historical_budgets.db)"
echo "4) All databases"
echo "5) Skip upload"
echo ""
read -p "Enter choice (1-5): " choice

case $choice in
    1)
        upload_database "holly-data-bronze" "$HOLLY_DB"
        ;;
    2)
        upload_database "rockford" "$ROCKFORD_DB"
        ;;
    3)
        upload_database "historical-budgets" "$HISTORICAL_DB"
        ;;
    4)
        upload_database "holly-data-bronze" "$HOLLY_DB"
        upload_database "rockford" "$ROCKFORD_DB"
        upload_database "historical-budgets" "$HISTORICAL_DB"
        ;;
    5)
        echo "Skipping upload."
        ;;
    *)
        echo "Invalid choice. Skipping upload."
        ;;
esac

echo ""
echo "=========================================="
echo "Setup complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Verify wrangler.toml has the correct database IDs"
echo "2. Run 'npm run dev' to test locally"
echo "3. Run 'npm run deploy' to deploy to Cloudflare Workers"
