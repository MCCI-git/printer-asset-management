<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Alert Digest</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f4f4f5; margin: 0; padding: 24px; color: #18181b; }
  .wrapper { max-width: 620px; margin: 0 auto; }
  .header { background: #6366f1; border-radius: 12px 12px 0 0; padding: 28px 32px; }
  .header h1 { color: #fff; margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.3px; }
  .header p { color: #c7d2fe; margin: 4px 0 0; font-size: 13px; }
  .body { background: #fff; border-radius: 0 0 12px 12px; padding: 28px 32px; }
  .section { margin-bottom: 28px; }
  .section:last-child { margin-bottom: 0; }
  .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #71717a; margin-bottom: 12px; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 11px; font-weight: 600; }
  .badge-red { background: #fee2e2; color: #dc2626; }
  .badge-amber { background: #fef3c7; color: #d97706; }
  .badge-orange { background: #ffedd5; color: #ea580c; }
  .badge-indigo { background: #e0e7ff; color: #4f46e5; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; padding: 8px 10px; background: #f4f4f5; color: #52525b; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
  td { padding: 9px 10px; border-bottom: 1px solid #f4f4f5; color: #3f3f46; vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  .footer { margin-top: 20px; font-size: 12px; color: #a1a1aa; text-align: center; }
  .all-clear { text-align: center; padding: 32px 0; color: #22c55e; font-weight: 600; font-size: 15px; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>Alert Digest</h1>
    <p>Printer Asset Management · {{ now()->format('d M Y, H:i') }}</p>
  </div>
  <div class="body">

    @php
      $hasAlerts = count($outOfStock) || count($lowStock) || count($expiringContracts) || count($overdueService);
      $contractsCritical = array_filter($expiringContracts, fn($c) => $c['tier'] === 'critical');
      $contractsUrgent   = array_filter($expiringContracts, fn($c) => $c['tier'] === 'urgent');
      $contractsNotice   = array_filter($expiringContracts, fn($c) => $c['tier'] === 'notice');
    @endphp

    @if (!$hasAlerts)
      <div class="all-clear">✓ All clear — no alerts at this time.</div>
    @endif

    @if (count($outOfStock))
    <div class="section">
      <div class="section-title"><span class="badge badge-red">Out of Stock</span> &nbsp;Immediate Action Required</div>
      <table>
        <tr><th>SKU</th><th>Name</th><th>Type</th><th>Printer</th></tr>
        @foreach ($outOfStock as $c)
        <tr>
          <td>{{ $c['sku'] }}</td>
          <td>{{ $c['name'] }}</td>
          <td>{{ $c['type'] }}</td>
          <td>{{ $c['printer'] ?? '—' }}</td>
        </tr>
        @endforeach
      </table>
    </div>
    @endif

    @if (count($lowStock))
    <div class="section">
      <div class="section-title"><span class="badge badge-amber">Low Stock</span> &nbsp;Order Within 5 Days</div>
      <table>
        <tr><th>SKU</th><th>Name</th><th>Qty</th><th>Threshold</th><th>Printer</th></tr>
        @foreach ($lowStock as $c)
        <tr>
          <td>{{ $c['sku'] }}</td>
          <td>{{ $c['name'] }}</td>
          <td>{{ $c['quantity'] }}</td>
          <td>{{ $c['threshold'] }}</td>
          <td>{{ $c['printer'] ?? '—' }}</td>
        </tr>
        @endforeach
      </table>
    </div>
    @endif

    @if (count($contractsCritical))
    <div class="section">
      <div class="section-title"><span class="badge badge-red">Critical — Expiring Within 7 Days</span> &nbsp;Renew Immediately</div>
      <table>
        <tr><th>Contract</th><th>Printer</th><th>Expires</th><th>Days Left</th><th>Notice Period</th><th>Manager</th></tr>
        @foreach ($contractsCritical as $c)
        <tr>
          <td>{{ $c['name'] }}</td>
          <td>{{ $c['vendor'] }}</td>
          <td>{{ $c['end_date'] }}</td>
          <td><strong>{{ $c['days_left'] }}</strong></td>
          <td>{{ $c['notice_days'] }} days</td>
          <td>{{ $c['manager'] ?? '—' }}</td>
        </tr>
        @endforeach
      </table>
    </div>
    @endif

    @if (count($contractsUrgent))
    <div class="section">
      <div class="section-title"><span class="badge badge-orange">Urgent — Expiring Within 14 Days</span> &nbsp;Action Required</div>
      <table>
        <tr><th>Contract</th><th>Printer</th><th>Expires</th><th>Days Left</th><th>Notice Period</th><th>Manager</th></tr>
        @foreach ($contractsUrgent as $c)
        <tr>
          <td>{{ $c['name'] }}</td>
          <td>{{ $c['vendor'] }}</td>
          <td>{{ $c['end_date'] }}</td>
          <td>{{ $c['days_left'] }}</td>
          <td>{{ $c['notice_days'] }} days</td>
          <td>{{ $c['manager'] ?? '—' }}</td>
        </tr>
        @endforeach
      </table>
    </div>
    @endif

    @if (count($contractsNotice))
    <div class="section">
      <div class="section-title"><span class="badge badge-indigo">Within Notice Period</span> &nbsp;Plan Renewal</div>
      <table>
        <tr><th>Contract</th><th>Printer</th><th>Expires</th><th>Days Left</th><th>Notice Period</th><th>Manager</th></tr>
        @foreach ($contractsNotice as $c)
        <tr>
          <td>{{ $c['name'] }}</td>
          <td>{{ $c['vendor'] }}</td>
          <td>{{ $c['end_date'] }}</td>
          <td>{{ $c['days_left'] }}</td>
          <td>{{ $c['notice_days'] }} days</td>
          <td>{{ $c['manager'] ?? '—' }}</td>
        </tr>
        @endforeach
      </table>
    </div>
    @endif

    @if (count($overdueService))
    <div class="section">
      <div class="section-title"><span class="badge badge-red">Overdue Service</span></div>
      <table>
        <tr><th>Asset Tag</th><th>Printer</th><th>Due Date</th><th>Location</th></tr>
        @foreach ($overdueService as $p)
        <tr>
          <td>{{ $p['asset_tag'] }}</td>
          <td>{{ $p['name'] }}</td>
          <td>{{ $p['due_date'] }}</td>
          <td>{{ $p['location'] ?? '—' }}</td>
        </tr>
        @endforeach
      </table>
    </div>
    @endif

  </div>
  <div class="footer">Sent by Printer Asset Management &mdash; Do not reply to this email.</div>
</div>
</body>
</html>
