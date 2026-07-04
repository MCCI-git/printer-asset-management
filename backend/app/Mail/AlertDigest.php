<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AlertDigest extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly array $lowStock,
        public readonly array $outOfStock,
        public readonly array $expiringContracts,
        public readonly array $overdueService,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Printer Asset Management — Alert Digest');
    }

    public function content(): Content
    {
        return new Content(view: 'emails.alert-digest');
    }
}
