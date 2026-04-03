@echo off
REM Rate Limiting Test Script using curl
REM Usage: test-rate-limit.bat [max_requests] [delay_ms]

if "%~1"=="" (
    set MAX_REQUESTS=20
) else (
    set MAX_REQUESTS=%~1
)

if "%~2"=="" (
    set DELAY_MS=100
) else (
    set DELAY_MS=%~2
)

set API_URL=http://localhost:5000/api
set ENDPOINT=%API_URL%/auth/tracking-status

echo 🚀 Starting Rate Limiting Test with curl
echo 📊 Target: %ENDPOINT%
echo 🔢 Max Requests: %MAX_REQUESTS%
echo ⏱️  Delay between requests: %DELAY_MS%ms
echo %DATE% %TIME%
echo ──────────────────────────────────────────────────────────────

set /a SUCCESS_COUNT=0
set RATE_LIMITED=0

for /L %%i in (1,1,%MAX_REQUESTS%) do (
    echo 📤 Making request #%%i...

    REM Make the request and capture both exit code and output
    curl -s -w "HTTPSTATUS:%%{http_code};" -H "Content-Type: application/json" -H "Authorization: Bearer test-token" %ENDPOINT% > temp_response.txt 2>nul

    REM Extract HTTP status code
    for /f "tokens=2 delims=:" %%a in ('findstr "HTTPSTATUS:" temp_response.txt') do set STATUS=%%a

    REM Get response body (remove the HTTPSTATUS line)
    findstr /v "HTTPSTATUS:" temp_response.txt > temp_body.txt

    if !STATUS! equ 429 (
        echo 🚫 Request #%%i - RATE LIMITED!
        echo    Status: !STATUS!
        echo    Response: 
        type temp_body.txt
        set RATE_LIMITED=1
        goto :break
    ) else if !STATUS! equ 200 (
        echo ✅ Request #%%i - SUCCESS
        set /a SUCCESS_COUNT+=1
    ) else (
        echo ⚠️  Request #%%i - ERROR (Status: !STATUS!)
        type temp_body.txt
    )

    REM Add delay between requests
    if %%i lss %MAX_REQUESTS% (
        timeout /t %DELAY_MS% /nobreak >nul 2>&1
    )
)

:break
echo.
echo ===================================================
echo 📈 TEST RESULTS
echo ===================================================
echo ✅ Successful requests: %SUCCESS_COUNT%
if %RATE_LIMITED% equ 1 (
    echo 🚫 Rate limited: YES
    echo 🎉 Rate limiting is working correctly!
) else (
    echo 🚫 Rate limited: NO
    echo ⚠️  Rate limiting may not be active or limits are too high
)

REM Clean up temp files
if exist temp_response.txt del temp_response.txt
if exist temp_body.txt del temp_body.txt

echo.
echo Test completed at %DATE% %TIME%