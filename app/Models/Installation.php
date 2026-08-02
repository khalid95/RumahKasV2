<?php

namespace App\Models;

use App\Models\Concerns\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Installation extends Model
{
    use HasUuid;

    protected $fillable = ['uuid', 'license_id', 'installation_identifier', 'token_hash', 'device_name', 'activated_at', 'last_online_at', 'revoked_at'];

    protected $hidden = ['token_hash'];

    protected function casts(): array
    {
        return ['activated_at' => 'datetime', 'last_online_at' => 'datetime', 'revoked_at' => 'datetime'];
    }

    public function license(): BelongsTo
    {
        return $this->belongsTo(License::class);
    }
}
