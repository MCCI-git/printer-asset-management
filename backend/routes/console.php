<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('alerts:send')->everyMinute();
Schedule::command('contracts:expire')->dailyAt('00:05');

// Snipe-IT auto-sync — frequency driven by saved config
(function () {
    $path   = storage_path('app/snipeit_config.json');
    $config = file_exists($path) ? json_decode(file_get_contents($path), true) : [];
    $freq   = $config['sync_freq'] ?? 'manual';

    $cmd = Schedule::command('snipeit:sync');
    match ($freq) {
        '15'    => $cmd->everyFifteenMinutes(),
        '30'    => $cmd->everyThirtyMinutes(),
        '60'    => $cmd->hourly(),
        'daily' => $cmd->daily(),
        default => null,
    };
})();
