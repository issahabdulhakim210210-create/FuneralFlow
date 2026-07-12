# Run migration, with optional pg_dump backup and verification.
# Usage:
#  $env:DATABASE_URL = 'postgres://USER:PASS@HOST:5432/DB'
#  powershell -ExecutionPolicy Bypass -File .\database\scripts\run-migration.ps1

param()

function Write-ErrAndExit($msg){ Write-Host $msg -ForegroundColor Red; exit 1 }

if (-not $env:DATABASE_URL) { Write-ErrAndExit 'DATABASE_URL environment variable not set. Set it then re-run the script.' }

Write-Host 'DATABASE_URL detected (not echoed). Proceeding...'

# Optional backup if pg_dump exists
$pgDump = Get-Command pg_dump -ErrorAction SilentlyContinue
if ($pgDump) {
  $timestamp = Get-Date -Format yyyyMMddHHmmss
  $dumpFile = "backup-funeral-requests-$timestamp.dump"
  Write-Host "pg_dump found. Creating backup $dumpFile..."
  try {
    & pg_dump $env:DATABASE_URL -Fc -f $dumpFile
    Write-Host "Backup created: $dumpFile"
  } catch {
    Write-Host "Warning: pg_dump failed or returned non-zero. Skipping backup. Error: $_" -ForegroundColor Yellow
  }
} else {
  Write-Host 'pg_dump not found on PATH; skipping automatic backup. Please create one manually if desired.' -ForegroundColor Yellow
}

# Ensure helper script exists
$applyScript = Join-Path $PSScriptRoot '..\apply_sql.js' | Resolve-Path -ErrorAction SilentlyContinue
if (-not $applyScript) {
  Write-ErrAndExit "Helper script database/scripts/apply_sql.js not found. Ensure you are running from repository root."
}

# Ensure node dependency pg is installed (only if node_modules missing the module)
if (-not (Test-Path node_modules\pg)) {
  Write-Host 'Installing node dependency "pg" (one-time)...'
  npm install pg
}

# Run migration
$migrationFile = Join-Path $PSScriptRoot '..\migrations\2026-06-22-add-request-funeral-date.sql'
if (-not (Test-Path $migrationFile)) { Write-ErrAndExit "Migration file not found: $migrationFile" }

Write-Host 'Applying migration...'
$rc = & node $applyScript $migrationFile; if ($LASTEXITCODE -ne 0) { Write-ErrAndExit 'Migration script failed. See output above.' }
Write-Host 'Migration applied successfully.' -ForegroundColor Green

# Verify column exists using node
Write-Host 'Verifying funeral_date column exists on funeral_requests...'
$verifyCmd = 'const { Client } = require("pg");(async()=>{const c=new Client({connectionString:process.env.DATABASE_URL});await c.connect();const r=await c.query("select column_name,data_type from information_schema.columns where table_name=\'funeral_requests\' and column_name=\'funeral_date\'");console.log(JSON.stringify(r.rows));await c.end();})().catch(e=>{console.error(e);process.exit(1)})'

$nodeOut = & node -e $verifyCmd
if ($LASTEXITCODE -ne 0) { Write-ErrAndExit 'Verification failed; see output above.' }
Write-Host "Verification output: $nodeOut"

Write-Host 'Done. If verification shows an empty array, the column may not exist. Copy the verification output and paste it here for assistance.' -ForegroundColor Cyan
