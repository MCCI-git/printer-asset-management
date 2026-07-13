<?php

namespace App\Services;

use App\Models\Printer;
use Illuminate\Support\Facades\Log;

class TopAccessService
{
    private const OID_SYS_DESCR      = '1.3.6.1.2.1.1.1.0';
    private const OID_SYS_NAME       = '1.3.6.1.2.1.1.5.0';
    private const OID_PRINTER_STATUS = '1.3.6.1.2.1.25.3.5.1.1.1';
    private const OID_SERIAL         = '1.3.6.1.2.1.43.5.1.1.17.1';
    private const OID_TOTAL_PAGES    = '1.3.6.1.2.1.43.10.2.1.4.1.1';
    private const OID_TONER_CURRENT  = '1.3.6.1.2.1.43.11.1.1.9.1.';
    private const OID_TONER_MAX      = '1.3.6.1.2.1.43.11.1.1.8.1.';
    private const OID_TONER_NAME     = '1.3.6.1.2.1.43.12.1.1.4.1.';

    public function getPrinters(): array
    {
        $printers = Printer::whereNotNull('ip_address')
            ->where('ip_address', '!=', '')
            ->get();

        return $printers->map(fn (Printer $p) => $this->queryPrinter($p))->values()->toArray();
    }

    public function queryPrinter(Printer $printer): array
    {
        $result = [
            'printer_id'  => $printer->id,
            'ip'          => $printer->ip_address,
            'name'        => $printer->name,
            'asset_tag'   => $printer->asset_tag,
            'reachable'   => false,
            'status'      => 'unknown',
            'serial'      => null,
            'model'       => null,
            'total_pages' => null,
            'toner'       => [],
            'error'       => null,
        ];

        try {
            snmp_set_valueretrieval(SNMP_VALUE_PLAIN);
            snmp_set_quick_print(true);

            $community = $printer->snmp_community ?: 'public';

            $sysDescr = @snmpget($printer->ip_address, $community, self::OID_SYS_DESCR, 1500000, 1);
            if ($sysDescr === false) {
                $result['error'] = 'Unreachable or SNMP not enabled.';
                $printer->update(['snmp_status' => 'failed']);
                return $result;
            }

            $result['reachable'] = true;
            $result['model']     = trim($sysDescr);

            $sysName = @snmpget($printer->ip_address, $community, self::OID_SYS_NAME, 1500000, 1);
            if ($sysName !== false) $result['name'] = trim($sysName);

            $serial = @snmpget($printer->ip_address, $community, self::OID_SERIAL, 1500000, 1);
            if ($serial !== false) $result['serial'] = trim($serial);

            $totalPages = @snmpget($printer->ip_address, $community, self::OID_TOTAL_PAGES, 1500000, 1);
            if ($totalPages !== false) $result['total_pages'] = (int) $totalPages;

            $statusRaw = @snmpget($printer->ip_address, $community, self::OID_PRINTER_STATUS, 1500000, 1);
            $result['status'] = $this->mapStatus((int) $statusRaw);

            $toner = [];
            for ($i = 1; $i <= 4; $i++) {
                $current = @snmpget($printer->ip_address, $community, self::OID_TONER_CURRENT . $i, 1500000, 1);
                $max     = @snmpget($printer->ip_address, $community, self::OID_TONER_MAX . $i, 1500000, 1);
                if ($current === false || $max === false) continue;
                $maxVal  = (int) $max;
                $curVal  = (int) $current;
                $nameRaw = @snmpget($printer->ip_address, $community, self::OID_TONER_NAME . $i, 1500000, 1);
                $toner[] = [
                    'name'    => ($nameRaw !== false) ? strtolower(trim($nameRaw)) : ['black','cyan','magenta','yellow'][$i - 1] ?? "toner-{$i}",
                    'current' => $curVal,
                    'max'     => $maxVal,
                    'percent' => $maxVal > 0 ? round(($curVal / $maxVal) * 100) : 0,
                ];
            }
            $result['toner'] = $toner;

            $printer->update(['snmp_status' => 'fetched']);

        } catch (\Exception $e) {
            Log::error('SNMP error', ['ip' => $printer->ip_address, 'error' => $e->getMessage()]);
            $result['error'] = $e->getMessage();
            $printer->update(['snmp_status' => 'failed']);
        }

        return $result;
    }

    public function testConnection(string $ip, string $community = 'public'): array
    {
        if (!$ip) return ['success' => false, 'message' => 'IP address is required.'];
        try {
            snmp_set_valueretrieval(SNMP_VALUE_PLAIN);
            snmp_set_quick_print(true);
            $sysDescr = @snmpget($ip, $community, self::OID_SYS_DESCR, 1500000, 1);
            if ($sysDescr === false) {
                return ['success' => false, 'message' => "Cannot reach {$ip} via SNMP. Check the IP, community string, and that SNMP is enabled on the printer."];
            }
            return ['success' => true, 'message' => "Connected to {$ip}. Device: " . trim($sysDescr)];
        } catch (\Exception $e) {
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    private function mapStatus(int $code): string
    {
        return match ($code) {
            3 => 'idle',
            4 => 'printing',
            5 => 'warmup',
            default => 'unknown',
        };
    }
}
