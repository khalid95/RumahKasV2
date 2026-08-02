<?php

namespace App\Services;

use App\Models\Installation;
use App\Models\License;
use App\Models\Payment;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LicenseService
{
    public function issueForPayment(Payment $payment): License
    {
        return DB::transaction(function () use ($payment) {
            if ($payment->status !== 'paid') {
                throw ValidationException::withMessages(['status' => 'Lisensi hanya dapat diterbitkan untuk pembayaran lunas.']);
            }

            return $payment->license()->firstOrCreate([], [
                'user_id' => $payment->user_id,
                'product_id' => $payment->product_id,
                'key_hash' => hash('sha256', Str::random(64)),
                'key_last_four' => strtoupper(Str::random(4)),
                'status' => 'active',
                'max_installations' => 1,
                'issued_at' => now(),
            ]);
        });
    }

    public function activate(License $license, string $identifier, ?string $deviceName): array
    {
        $installation = $license->installations()->where('installation_identifier', $identifier)->first();
        if ($installation?->revoked_at) {
            throw ValidationException::withMessages(['email' => 'Perangkat ini telah dicabut oleh admin.']);
        }
        if (! $installation && $license->installations()->whereNull('revoked_at')->count() >= $license->max_installations) {
            throw ValidationException::withMessages(['email' => 'Batas perangkat lisensi telah tercapai. Hubungi admin.']);
        }

        $plainToken = Str::random(80);
        $installation ??= new Installation(['installation_identifier' => $identifier, 'activated_at' => now()]);
        $installation->fill([
            'device_name' => $deviceName,
            'token_hash' => hash('sha256', $plainToken),
            'last_online_at' => now(),
            'revoked_at' => null,
        ]);
        $license->installations()->save($installation);

        return [$installation, $plainToken];
    }

    public function replaceActiveInstallation(License $license, string $identifier, ?string $deviceName): array
    {
        return DB::transaction(function () use ($license, $identifier, $deviceName) {
            $license->installations()->whereNull('revoked_at')->update(['revoked_at' => now(), 'token_hash' => null]);

            return $this->activate($license, $identifier, $deviceName);
        });
    }
}
