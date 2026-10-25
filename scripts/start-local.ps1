param()
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
if (-not (Get-Command java -ErrorAction SilentlyContinue)) { throw 'JDK 21 kurun ve JAVA_HOME/PATH ayarlarını yapın.' }
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) { throw 'Docker Desktop kurun ve çalıştırın.' }
$envFile = Join-Path $projectRoot '.env'
if (-not (Test-Path -LiteralPath $envFile)) { throw '.env.example dosyasını .env olarak kopyalayıp yerel parolayı değiştirin.' }
$allowed = @('POSTGRES_DB','POSTGRES_USER','POSTGRES_PASSWORD','POSTGRES_PORT','SERVER_PORT','ROOM_CODE_SECRET','KESIF_ROOM_TTL','KESIF_INVITATION_TTL','KESIF_QUESTION_DURATION','KESIF_REVEAL_DURATION','KESIF_REWARDS_ENABLED','KESIF_COMPLETION_XP','KESIF_CORRECT_ANSWER_XP','KESIF_COLLECTION_COMPLETION_XP','KESIF_COLLECTION_MAPPING')
foreach ($line in Get-Content -LiteralPath $envFile) {
    if ($line -match '^([A-Z_]+)=(.*)$' -and $allowed -contains $Matches[1]) {
        [Environment]::SetEnvironmentVariable($Matches[1], $Matches[2], 'Process')
    }
}
foreach ($required in @('POSTGRES_DB','POSTGRES_USER','POSTGRES_PASSWORD','POSTGRES_PORT')) {
    if (-not [Environment]::GetEnvironmentVariable($required, 'Process')) { throw "$required eksik." }
}
$env:SPRING_DATASOURCE_URL = 'jdbc:postgresql://localhost:{0}/{1}' -f $env:POSTGRES_PORT, $env:POSTGRES_DB
Push-Location $projectRoot
try {
    docker compose up -d --wait postgres
    if ($LASTEXITCODE -ne 0) { throw 'PostgreSQL başlatılamadı.' }
    Push-Location (Join-Path $projectRoot 'backend')
    try {
        & .\mvnw.cmd spring-boot:run '-Dspring-boot.run.profiles=local'
        if ($LASTEXITCODE -ne 0) { throw 'Backend çalıştırma başarısız.' }
    } finally { Pop-Location }
} finally { Pop-Location }
