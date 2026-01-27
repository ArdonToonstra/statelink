# Database Sync Script
# Syncs production database to local Docker container

$ErrorActionPreference = "Stop"

# Configuration
$ContainerName = "groupvibes-db"
$LocalDbUser = "postgres"
$LocalDbName = "groupvibes"
$BackupDir = "backups"

# Create backup directory if it doesn't exist
if (!(Test-Path -Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
    Write-Host "Created backup directory: $BackupDir" -ForegroundColor Gray
}

# Prompt for Production Database URL
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "      GroupVibes Database Sync Tool       " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
$ProdDbUrl = Read-Host "Enter Production Database Connection String (postgres://...)"

if ([string]::IsNullOrWhiteSpace($ProdDbUrl)) {
    Write-Error "Database URL cannot be empty."
}

# Ensure URL has protocol
if (-not ($ProdDbUrl -match "^postgres(ql)?://")) {
    Write-Host "Prefixing URL with 'postgresql://'..." -ForegroundColor Gray
    $ProdDbUrl = "postgresql://$ProdDbUrl"
}

$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$BackupFile = "$BackupDir\prod-backup-$Timestamp.sql"
# Convert to absolute path for Docker (not strictly needed if piping, but good for local ref)
$AbsBackupFile = (Resolve-Path $BackupDir).Path + "\prod-backup-$Timestamp.sql"

Write-Host "`n[1/3] Dumping production database..." -ForegroundColor Yellow
try {
    # Run pg_dump inside the container to avoid local dependencies
    # We pipe the output to a local file
    # --no-owner --no-acl: Best practice when restoring to a different environment to avoid permission errors
    # --clean --if-exists: Drops objects before creating them to ensure a clean state
    docker exec -i $ContainerName pg_dump "$ProdDbUrl" --no-owner --no-acl --clean --if-exists | Out-File -FilePath $BackupFile -Encoding UTF8
    
    # Check if file has content (basic success check)
    if ((Get-Item $BackupFile).Length -lt 100) {
        throw "Backup file is empty or too small. Check your connection string."
    }
    
    Write-Host "Backup saved to: $BackupFile" -ForegroundColor Green
}
catch {
    Write-Error "Failed to create backup. Error: $_"
}

Write-Host "`n[2/3] Restoring to local database ($LocalDbName)..." -ForegroundColor Yellow
try {
    # Pipe the backup file content into psql running inside the container
    Get-Content $BackupFile | docker exec -i $ContainerName psql -U $LocalDbUser -d $LocalDbName
    
    Write-Host "Restore completed successfully." -ForegroundColor Green
}
catch {
    Write-Error "Failed to restore backup. Error: $_"
}

Write-Host "`n[3/3] Done!" -ForegroundColor Cyan
Write-Host "You may need to restart your application server if schema changes were applied." -ForegroundColor Gray
