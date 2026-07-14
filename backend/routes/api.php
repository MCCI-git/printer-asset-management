<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\PrinterPageCountController;
use App\Http\Controllers\Api\BudgetController;
use App\Http\Controllers\Api\ConsumableController;
use App\Http\Controllers\Api\ContractController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\PrinterController;
use App\Http\Controllers\Api\SnipeItController;
use App\Http\Controllers\Api\TopAccessController;
use App\Http\Controllers\Api\PrintManagerController;
use App\Http\Controllers\Api\SupplierController;
use App\Http\Controllers\Api\SmtpController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\ActivityLogController;
use App\Http\Controllers\Api\WorkOrderController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::put('/user/profile', [AuthController::class, 'updateProfile']);
    Route::put('/user/password', [AuthController::class, 'updatePassword']);

    Route::get('/dashboard/stats', [DashboardController::class, 'stats']);

    Route::apiResource('printers', PrinterController::class);
    Route::get('/printers/opex-ytd', [PrinterPageCountController::class, 'opexYtd']);
    Route::get('/printers/{printer}/page-counts', [PrinterPageCountController::class, 'index']);
    Route::post('/printers/{printer}/page-counts', [PrinterPageCountController::class, 'store']);
    Route::delete('/printers/{printer}/page-counts/{log}', [PrinterPageCountController::class, 'destroy']);
    Route::apiResource('consumables', ConsumableController::class);
    Route::get('/consumable-assignments', [ConsumableController::class, 'assignments']);
    Route::post('/consumables/{consumable}/assign', [ConsumableController::class, 'assign']);
    Route::delete('/consumable-assignments/{assignment}', [ConsumableController::class, 'unassign']);
    Route::apiResource('contracts', ContractController::class);
    Route::post('/contracts/{contract}/renew', [ContractController::class, 'renew']);
    Route::get('/contract-renewals', [ContractController::class, 'renewals']);
    Route::post('/contract-renewals', [ContractController::class, 'storeRenewal']);
    Route::delete('/contract-renewals/{renewal}', [ContractController::class, 'destroyRenewal']);
    Route::post('/contracts/{contract}/upload-pdf', [ContractController::class, 'uploadPdf']);
    Route::apiResource('suppliers', SupplierController::class);

    Route::prefix('snipeit')->group(function () {
        Route::get('/assets', [SnipeItController::class, 'assets']);
        Route::get('/assets/{id}', [SnipeItController::class, 'asset']);
        Route::get('/categories', [SnipeItController::class, 'categories']);
        Route::get('/locations', [SnipeItController::class, 'locations']);
        Route::post('/test', [SnipeItController::class, 'testConnection']);
        Route::post('/sync', [SnipeItController::class, 'sync']);
        Route::get('/config', [SnipeItController::class, 'getConfig']);
        Route::post('/config', [SnipeItController::class, 'saveConfig']);
    });

    Route::prefix('print-manager')->group(function () {
        Route::get('/plans', [PrintManagerController::class, 'plans']);
        Route::put('/plans/{id}', [PrintManagerController::class, 'updatePlan']);
        Route::get('/students', [PrintManagerController::class, 'students']);
        Route::post('/students', [PrintManagerController::class, 'storeStudent']);
        Route::put('/students/{id}', [PrintManagerController::class, 'updateStudent']);
        Route::delete('/students/{id}', [PrintManagerController::class, 'deleteStudent']);
        Route::post('/students/{id}/purchase', [PrintManagerController::class, 'logPurchase']);
        Route::delete('/purchases/{id}', [PrintManagerController::class, 'deletePurchase']);
        Route::post('/students/{id}/email', [PrintManagerController::class, 'sendEmail']);
        Route::get('/budget', [PrintManagerController::class, 'budget']);
        Route::get('/email-template', [PrintManagerController::class, 'getEmailTemplate']);
        Route::post('/email-template', [PrintManagerController::class, 'saveEmailTemplate']);
    });

    Route::prefix('topaccess')->group(function () {
        Route::get('/printers', [TopAccessController::class, 'printers']);
        Route::get('/printer', [TopAccessController::class, 'printer']);
        Route::post('/refresh/{printer}', [TopAccessController::class, 'refreshOne']);
        Route::post('/test', [TopAccessController::class, 'test']);
        Route::get('/diagnostics', [TopAccessController::class, 'diagnostics']);
    });

    Route::prefix('admin')->group(function () {
        Route::get('/smtp', [SmtpController::class, 'get']);
        Route::post('/smtp', [SmtpController::class, 'save']);
        Route::post('/smtp/test', [SmtpController::class, 'test']);
        Route::get('/notifications', [SmtpController::class, 'getNotifications']);
        Route::post('/notifications', [SmtpController::class, 'saveNotifications']);
        Route::post('/notifications/send', [SmtpController::class, 'sendAlerts']);
    });

    Route::apiResource('users', UserController::class);
    Route::patch('/users/{user}/toggle-status', [UserController::class, 'toggleStatus']);

    Route::apiResource('work-orders', WorkOrderController::class)->except(['show']);

    Route::get('/activity-logs', [ActivityLogController::class, 'index']);
    Route::get('/activity-logs/export', [ActivityLogController::class, 'export']);

    Route::get('/budgets/history', [BudgetController::class, 'history']);
    Route::get('/budgets/all', [BudgetController::class, 'all']);
    Route::get('/budgets/actual', [BudgetController::class, 'actual']);
    Route::get('/budgets/breakdown', [BudgetController::class, 'breakdown']);
    Route::get('/budgets', [BudgetController::class, 'index']);
    Route::put('/budgets', [BudgetController::class, 'upsert']);
});
