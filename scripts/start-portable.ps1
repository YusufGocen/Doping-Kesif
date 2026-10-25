param()
$ErrorActionPreference = 'Stop'
$kesifProject = Split-Path -Parent $PSScriptRoot
$kesifWorkspace = Split-Path -Parent (Split-Path -Parent $kesifProject)
$kesifWork = Join-Path $kesifWorkspace 'work'
$kesifJava = Join-Path $kesifWork 'tooling\temurin21\jdk-21.0.12.1+1\bin\java.exe'
$kesifInstalledJava = Get-Command java -ErrorAction SilentlyContinue
if ($kesifInstalledJava) {
    $kesifJavaVersion = & $kesifInstalledJava.Source --version | Out-String
    if ($kesifJavaVersion -match '(openjdk|java) 21\.') { $kesifJava = $kesifInstalledJava.Source }
}
$kesifPgBin = Join-Path $kesifWork 'tooling\postgres16\pgsql\bin'
$kesifData = Join-Path $kesifWork 'postgres-test-data'
$kesifPassword = Join-Path $kesifWork 'postgres-test-password.txt'
$kesifJar = Join-Path $kesifProject 'backend\target\kesif-backend-0.1.0-SNAPSHOT.jar'
foreach ($kesifRequired in @($kesifJava,$kesifPassword,$kesifJar,(Join-Path $kesifData 'PG_VERSION'))) {
    if (!(Test-Path -LiteralPath $kesifRequired)) { throw "Portable prerequisite missing: $kesifRequired" }
}
& (Join-Path $kesifPgBin 'pg_isready.exe') -h 127.0.0.1 -p 55432 -q
if ($LASTEXITCODE -ne 0) {
    Start-Process -FilePath (Join-Path $kesifPgBin 'postgres.exe') -ArgumentList @('-D',('"'+$kesifData+'"'),'-h','127.0.0.1','-p','55432') -WindowStyle Hidden -RedirectStandardOutput (Join-Path $kesifWork 'portable-postgres.out.log') -RedirectStandardError (Join-Path $kesifWork 'portable-postgres.err.log')
    $kesifReady = $false
    for ($kesifAttempt=0; $kesifAttempt -lt 40; $kesifAttempt++) {
        Start-Sleep -Milliseconds 250
        & (Join-Path $kesifPgBin 'pg_isready.exe') -h 127.0.0.1 -p 55432 -q
        if ($LASTEXITCODE -eq 0) { $kesifReady=$true; break }
    }
    if (!$kesifReady) { throw 'Portable PostgreSQL failed to start; inspect work/portable-postgres.err.log.' }
}
$env:PGPASSWORD = [IO.File]::ReadAllText($kesifPassword)
try {
    $kesifExists = & (Join-Path $kesifPgBin 'psql.exe') -h 127.0.0.1 -p 55432 -U kesif_test -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='doping_kesif_dev'"
    if ($LASTEXITCODE -ne 0) { throw 'Database connection failed.' }
    if ($kesifExists -notcontains '1') {
        & (Join-Path $kesifPgBin 'createdb.exe') -h 127.0.0.1 -p 55432 -U kesif_test doping_kesif_dev
        if ($LASTEXITCODE -ne 0) { throw 'Development database creation failed.' }
    }
} finally { Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue }
$env:SPRING_DATASOURCE_URL = 'jdbc:postgresql://127.0.0.1:55432/doping_kesif_dev'
$env:POSTGRES_USER = 'kesif_test'
$env:POSTGRES_PASSWORD = [IO.File]::ReadAllText($kesifPassword)
Write-Host 'Starting local backend. Health: http://localhost:8080/actuator/health'
Write-Host 'Swagger: http://localhost:8080/swagger-ui/index.html'
Write-Host 'Keep this terminal open. Ctrl+C stops the backend; PostgreSQL remains running.'
try {
    & $kesifJava -jar $kesifJar '--spring.profiles.active=local' '--server.port=8080' '--logging.level.root=INFO'
    if ($LASTEXITCODE -ne 0) { throw 'Backend exited with an error.' }
} finally { Remove-Item Env:POSTGRES_PASSWORD -ErrorAction SilentlyContinue }
