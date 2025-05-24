
# Variables
APP_NAME = para-shop
PORT = 3001

# Default target
.PHONY: help
help:
	@echo "Available commands:"
	@echo "  make setup         - Set up the entire application (DB, migrations, seed)"
	@echo "  make start         - Start the application in development mode"
	@echo "  make build         - Build the application for production"
	@echo "  make db-start      - Start the PostgreSQL database via Docker"
	@echo "  make db-stop       - Stop the PostgreSQL database"
	@echo "  make db-migrate    - Run Prisma migrations"
	@echo "  make db-seed       - Seed the database with initial data"
	@echo "  make prisma-studio - Start Prisma Studio to view/edit database"
	@echo "  make extract-code  - Extract code files to text for documentation"
	@echo "  make clean         - Clean build artifacts"

# Set up everything
.PHONY: setup
setup: db-start db-migrate db-seed

# Start the development server
.PHONY: start
start:
	npm run dev

# Build the application
.PHONY: build
build:
	npm run build

# Start the database
.PHONY: db-start
db-start:
	docker-compose up -d postgres

# Stop the database
.PHONY: db-stop
db-stop:
	docker-compose down

# Run migrations
.PHONY: db-migrate
db-migrate:
	npx prisma migrate dev

# Run migrations with a specific name
.PHONY: migrate-name
migrate-name:
	@read -p "Enter migration name: " name; \
	npx prisma migrate dev --name $name

# Seed the database
.PHONY: db-seed
db-seed:
	npx prisma db seed

# Load all fixtures
.PHONY: load-fixtures
load-fixtures:
	node prisma/fixtures/run.js

# Run specific fixture
.PHONY: fixture
fixture:
	@read -p "Enter fixture name (e.g., users, products): " name; \
	node prisma/fixtures/$name.js

# Start Prisma Studio
.PHONY: prisma-studio
prisma-studio:
	npx prisma studio

# Clean build artifacts
.PHONY: clean
clean:
	rm -rf .next
	rm -rf node_modules/.cache



######################################################################
######################################################################
######################################################################
###################  EXTRACT CODE FOR CLAUDE  ########################
######################################################################
######################################################################


# Original full extract (keep working)
.PHONY: extract-code
extract-code:
	rm -f all_texts.txt file_list.txt
	find . \( -path "*/src/*" -o -path "*/prisma_/*" \) -type f \
		! -path "*/.next/*" ! -path "*/.history/*" ! -path "*/node_modules/*" \
		! -path "*/public/*" ! -path "*/.git/*" ! -name "*.ico" ! -name "*.json" \
		! -name "*.log" ! -name "*.gitkeep" ! -name "*.d.ts" ! -name "*.node" \
		! -name "*.map" ! -name "*.test.*" ! -name "*.spec.*" > file_list.txt
	@bash -c 'while read -r file; do echo "File: $$file" >> all_texts.txt; cat "$$file" >> all_texts.txt; echo "" >> all_texts.txt; done < file_list.txt'
	echo "Directory Structure:" >> all_texts.txt
	tree -I '.next|.history|node_modules|dist|coverage|.turbo|.cache|*.ico|*.json|*.log|*.gitkeep|*.d.ts|*.node|*.map|*.test.*|*.spec.*' --dirsfirst -a >> all_texts.txt

# Medium extract using simple commands
.PHONY: extract-code-medium
extract-code-medium:
	rm -f code_medium.txt file_list_medium.txt
	find . \( -path "*/src/*" -o -path "*/prisma_/*" -o -path "*/prisma/schema.prisma" \) -type f \
		\( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.prisma" \) \
		! -path "*/.next/*" ! -path "*/.history/*" ! -path "*/node_modules/*" \
		! -path "*/public/*" ! -path "*/.git/*" ! -name "*.test.*" \
		! -name "*.spec.*" ! -name "*.stories.*" > file_list_medium.txt
	echo "=== MEDIUM CODE EXTRACT ===" > code_medium.txt
	echo "Files: $(cat file_list_medium.txt | wc -l)" >> code_medium.txt
	echo "Generated: $(date)" >> code_medium.txt
	echo "" >> code_medium.txt
	./process_medium.sh
	rm -f file_list_medium.txt
	@echo "Medium extract created: code_medium.txt"
	@echo "Size: $(du -h code_medium.txt | cut -f1)"

# Compact extract using external script
.PHONY: extract-code-compact
extract-code-compact:
	rm -f code_compact.txt file_list_compact.txt
	find . \( -path "*/src/*" -o -path "*/prisma_/*" -o -path "*/prisma/schema.prisma" \) -type f \
		\( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.prisma" \) \
		! -path "*/.next/*" ! -path "*/.history/*" ! -path "*/node_modules/*" \
		! -path "*/public/*" ! -path "*/.git/*" ! -name "*.test.*" \
		! -name "*.spec.*" ! -name "*.stories.*" > file_list_compact.txt
	echo "=== COMPACT CODE EXTRACT ===" > code_compact.txt
	echo "Files: $(cat file_list_compact.txt | wc -l)" >> code_compact.txt
	echo "Generated: $(date)" >> code_compact.txt
	echo "" >> code_compact.txt
	./process_compact.sh
	rm -f file_list_compact.txt
	@echo "Compact extract created: code_compact.txt"
	@echo "Size: $(du -h code_compact.txt | cut -f1)"

# Just signatures (minimal)
.PHONY: extract-code-signatures
extract-code-signatures:
	rm -f code_signatures.txt file_list_signatures.txt
	find . \( -path "*/src/*" -o -path "*/prisma_/*" \) -type f \
		\( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.prisma" \) \
		! -path "*/.next/*" ! -path "*/.history/*" ! -path "*/node_modules/*" \
		! -path "*/public/*" ! -path "*/.git/*" ! -name "*.test.*" \
		! -name "*.spec.*" ! -name "*.stories.*" > file_list_signatures.txt
	echo "=== SIGNATURES ONLY EXTRACT ===" > code_signatures.txt
	echo "Files: $$(cat file_list_signatures.txt | wc -l)" >> code_signatures.txt
	echo "Generated: $$(date)" >> code_signatures.txt
	echo "" >> code_signatures.txt
	./process_signatures.sh
	rm -f file_list_signatures.txt
	@echo "Signatures extract created: code_signatures.txt"
	@echo "Size: $$(du -h code_signatures.txt | cut -f1)"

# Create zip archive
.PHONY: create-code-zip
create-code-zip:
	rm -f code_archive.zip
	mkdir -p temp_code_archive
	# Include Prisma schema specifically
	find . \( -path "*/src/*" -o -path "*/prisma_/*" -o -path "*/prisma/schema.prisma" \) -type f \
		\( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.prisma" \) \
		! -path "*/.next/*" ! -path "*/.history/*" ! -path "*/node_modules/*" \
		! -path "*/public/*" ! -path "*/.git/*" ! -name "*.test.*" \
		! -name "*.spec.*" -exec cp --parents {} temp_code_archive/ \;
	# Add essential config files
	find . -maxdepth 2 -name "package.json" -o -name "tsconfig.json" -o -name "next.config.*" -o -name "tailwind.config.*" | \
		head -5 | xargs -I {} cp --parents {} temp_code_archive/ 2>/dev/null || true
	# Create comprehensive project overview
	echo "Project Overview - $(date)" > temp_code_archive/PROJECT_INFO.txt
	echo "Generated by: make create-code-zip" >> temp_code_archive/PROJECT_INFO.txt
	echo "" >> temp_code_archive/PROJECT_INFO.txt
	echo "=== DIRECTORY STRUCTURE ===" >> temp_code_archive/PROJECT_INFO.txt
	find temp_code_archive -type f | sort >> temp_code_archive/PROJECT_INFO.txt
	echo "" >> temp_code_archive/PROJECT_INFO.txt
	echo "=== DATABASE SCHEMA PREVIEW ===" >> temp_code_archive/PROJECT_INFO.txt
	[ -f "prisma/schema.prisma" ] && head -50 prisma/schema.prisma >> temp_code_archive/PROJECT_INFO.txt || echo "No schema.prisma found" >> temp_code_archive/PROJECT_INFO.txt
	# Create zip
	cd temp_code_archive && zip -r ../code_archive.zip .
	rm -rf temp_code_archive
	@echo "Code archive created: code_archive.zip"
	@echo "Archive size: $(du -h code_archive.zip | cut -f1)"
	@echo "Contents: Source code + Prisma schema + Config files"

# Utilities
.PHONY: preview-files
preview-files:
	@echo "Files that will be included:"
	@echo "============================"
	@find . \( -path "*/src/*" -o -path "*/prisma_/*" -o -path "*/prisma/schema.prisma" \) -type f \
		\( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.prisma" \) \
		! -path "*/.next/*" ! -path "*/.history/*" ! -path "*/node_modules/*" \
		! -path "*/public/*" ! -path "*/.git/*" ! -name "*.test.*" \
		! -name "*.spec.*" ! -name "*.stories.*" | head -20
	@echo ""
	@echo "Total files: $(find . \( -path \"*/src/*\" -o -path \"*/prisma_/*\" -o -path \"*/prisma/schema.prisma\" \) -type f \( -name \"*.ts\" -o -name \"*.tsx\" -o -name \"*.js\" -o -name \"*.jsx\" -o -name \"*.prisma\" \) ! -path \"*/.next/*\" ! -path \"*/.history/*\" ! -path \"*/node_modules/*\" ! -path \"*/public/*\" ! -path \"*/.git/*\" ! -name \"*.test.*\" ! -name \"*.spec.*\" ! -name \"*.stories.*\" | wc -l)"
	@echo ""
	@[ -f "prisma/schema.prisma" ] && echo "✓ Database schema will be included" || echo "⚠ No prisma/schema.prisma found"

.PHONY: show-sizes
show-sizes:
	@echo "File size comparison:"
	@[ -f all_texts.txt ] && echo "Full: $$(du -h all_texts.txt | cut -f1)" || echo "Full: Not created"
	@[ -f code_medium.txt ] && echo "Medium: $$(du -h code_medium.txt | cut -f1)" || echo "Medium: Not created"
	@[ -f code_compact.txt ] && echo "Compact: $$(du -h code_compact.txt | cut -f1)" || echo "Compact: Not created"
	@[ -f code_signatures.txt ] && echo "Signatures: $$(du -h code_signatures.txt | cut -f1)" || echo "Signatures: Not created"
	@[ -f code_archive.zip ] && echo "Zip: $$(du -h code_archive.zip | cut -f1)" || echo "Zip: Not created"

.PHONY: clean-extracts
clean-extracts:
	rm -f all_texts.txt file_list.txt code_medium.txt file_list_medium.txt 
	rm -f code_compact.txt file_list_compact.txt code_signatures.txt file_list_signatures.txt 
	rm -f code_archive.zip
	rm -rf temp_code_archive
	@echo "All extract files cleaned"

.PHONY: help-extract
help-extract:
	@echo "Commands:"
	@echo "========================================="
	@echo "extract-code-medium     - Code without comments (recommended for AI)"
	@echo "create-code-zip         - Zip archive (BEST for sharing with AI)"
	@echo "extract-code-compact    - Smart selection of important parts"
	@echo "extract-code-signatures - Just imports/exports/types"
	@echo "show-sizes             - Compare file sizes"
	@echo "preview-files          - See what will be included"
	@echo "clean-extracts         - Clean up all generated files"
	@echo ""
	@echo "🚀 RECOMMENDED WORKFLOW:"
	@echo "1. make create-code-zip    (Best for sharing - includes schema)"
	@echo "2. make extract-code-medium (If you prefer text files)"
	@echo ""
	@echo "📊 The zip includes:"
	@echo "  • All source code (src/)"
	@echo "  • Database schema (prisma/schema.prisma)"
	@echo "  • Config files (package.json, tsconfig.json, etc.)"
	@echo "  • Project overview with schema preview"

######################################################################
######################################################################
######################################################################
###################  END OF EXTRACT CODE FOR CLAUDE  #################
######################################################################
######################################################################

# Start both the database and application USED
.PHONY: start-all 
start-all: db-start start

# Reset database (drop everything and recreate)
.PHONY: db-reset
db-reset:
	npx prisma migrate reset --force

# Clear all data without dropping schema
.PHONY: clear-db
clear-db:
	node prisma/fixtures/clear-all.js

# Deploy (for production)
.PHONY: deploy
deploy: build
	npm run start


# Reset database and reload all fixtures USED
.PHONY: reset-and-reload
reset-and-reload:
	@echo "🗑️  Resetting database and reloading fixtures..."
	
	# Reset the database schema (skip the seed)
	npx prisma migrate reset --force --skip-seed
	@echo "✅ Database schema reset"
	
	# Run fixtures runner script to load all fixtures in order
	@echo "📦 Loading all fixtures..."
	node prisma/fixtures/run.js
	
	@echo "✅ All fixtures loaded"