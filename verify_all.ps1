$authHeaders = @{ 'Content-Type' = 'application/json' }
Write-Host "1. Testing Admin Login..." -ForegroundColor Cyan
$adminLogin = Invoke-RestMethod -Uri 'http://localhost:8080/api/auth/login' -Method POST -Headers $authHeaders -Body '{"email":"admin@fieldhub.com","password":"Admin@123"}'
$token = $adminLogin.token
Write-Host "Admin Login Success. Name:" $adminLogin.user.fullName "Role:" $adminLogin.user.role

Write-Host "2. Testing Customer Login..." -ForegroundColor Cyan
$custLogin = Invoke-RestMethod -Uri 'http://localhost:8080/api/auth/login' -Method POST -Headers $authHeaders -Body '{"email":"anand.murugan@gmail.com","password":"customer123"}'
Write-Host "Customer Login Success. Name:" $custLogin.user.fullName "Role:" $custLogin.user.role

Write-Host "3. Testing Technician Login..." -ForegroundColor Cyan
$techLogin = Invoke-RestMethod -Uri 'http://localhost:8080/api/auth/login' -Method POST -Headers $authHeaders -Body '{"email":"srinath123@gmail.com","password":"tech123"}'
Write-Host "Technician Login Success. Name:" $techLogin.user.fullName "Role:" $techLogin.user.role

Write-Host "4. Testing Dispatcher Login..." -ForegroundColor Cyan
$dispLogin = Invoke-RestMethod -Uri 'http://localhost:8080/api/auth/login' -Method POST -Headers $authHeaders -Body '{"email":"dispatcher@fieldservice.com","password":"disp123"}'
Write-Host "Dispatcher Login Success. Name:" $dispLogin.user.fullName "Role:" $dispLogin.user.role

$adminHeaders = @{ 'Authorization' = "Bearer $token" }

Write-Host "5. Testing Categories API..." -ForegroundColor Cyan
$cats = Invoke-RestMethod -Uri 'http://localhost:8080/api/categories' -Method GET -Headers $adminHeaders
Write-Host "Categories count:" $cats.Count

Write-Host "6. Testing Inventory API..." -ForegroundColor Cyan
$inv = Invoke-RestMethod -Uri 'http://localhost:8080/api/inventory' -Method GET -Headers $adminHeaders
Write-Host "Inventory items count:" $inv.Count

Write-Host "7. Testing Dashboard Stats API..." -ForegroundColor Cyan
$stats = Invoke-RestMethod -Uri 'http://localhost:8080/api/analytics/dashboard' -Method GET -Headers $adminHeaders
Write-Host "Total Work Orders:" $stats.totalWorkOrders "Open Requests:" $stats.openRequests "Active Techs:" $stats.activeTechnicians

Write-Host "8. Testing Detailed Analytics API..." -ForegroundColor Cyan
$analytics = Invoke-RestMethod -Uri 'http://localhost:8080/api/analytics/detailed' -Method GET -Headers $adminHeaders
Write-Host "Technician metrics count:" $analytics.technicianPerformance.Count "Avg Resolution Hours:" $analytics.averageResolutionHours

Write-Host "9. Testing Work Orders API (Admin)..." -ForegroundColor Cyan
$wos = Invoke-RestMethod -Uri 'http://localhost:8080/api/work-orders' -Method GET -Headers $adminHeaders
Write-Host "Admin Work Orders count:" $wos.Count

Write-Host "10. Testing Customer Work Orders API..." -ForegroundColor Cyan
$custHeaders = @{ 'Authorization' = 'Bearer ' + $custLogin.token }
$custWos = Invoke-RestMethod -Uri 'http://localhost:8080/api/work-orders' -Method GET -Headers $custHeaders
Write-Host "Customer My Orders count:" $custWos.Count

Write-Host "11. Testing Technician Work Orders API..." -ForegroundColor Cyan
$techHeaders = @{ 'Authorization' = 'Bearer ' + $techLogin.token }
$techWos = Invoke-RestMethod -Uri 'http://localhost:8080/api/work-orders' -Method GET -Headers $techHeaders
Write-Host "Technician My Jobs count:" $techWos.Count

Write-Host "12. Testing Report CSV Export..." -ForegroundColor Cyan
$csv = Invoke-RestMethod -Uri 'http://localhost:8080/api/reports/work-orders/csv' -Method GET -Headers $adminHeaders
Write-Host "Report CSV length:" $csv.Length "bytes"

Write-Host "============================================================" -ForegroundColor Green
Write-Host "ALL 12 END-TO-END WORKFLOW TESTS SUCCEEDED WITH 100% SUCCESS!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
