<?php

namespace App\Console\Commands;

use App\Services\AlertService;
use Illuminate\Console\Command;

class SendAlertDigest extends Command
{
    protected $signature   = 'alerts:send {--force : Bypass dedup and send even if alerts unchanged}';
    protected $description = 'Send alert digest email when new alerts are detected';

    public function handle(AlertService $alerts): int
    {
        $sent = $alerts->send(force: $this->option('force'));
        $this->info($sent ? 'Alert digest sent.' : 'No new alerts to send.');
        return self::SUCCESS;
    }
}
