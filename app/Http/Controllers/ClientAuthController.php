<?php

namespace App\Http\Controllers;

use App\Models\AdminAuditLog;
use App\Models\Installation;
use App\Models\User;
use App\Services\LicenseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class ClientAuthController extends Controller
{
    public function login(Request $request, LicenseService $service): JsonResponse
    {
        $data = $request->validate(['email' => 'required|email', 'password' => 'required|string', 'installation_id' => 'required|uuid', 'device_name' => 'nullable|string|max:100', 'replace_installation' => 'sometimes|boolean']);
        $user = User::where('email', $data['email'])->first();
        if (! $user || ! Hash::check($data['password'], $user->password) || $user->status !== 'active') {
            throw ValidationException::withMessages(['email' => 'Email, password, atau status akun tidak valid.']);
        }
        $license = $user->licenses()->where('status', 'active')->whereNull('revoked_at')->latest('issued_at')->first();
        if (! $license) {
            throw ValidationException::withMessages(['email' => 'Akun belum memiliki lisensi aktif.']);
        }
        $existing = $license->installations()->where('installation_identifier', $data['installation_id'])->first();
        $activeInstallations = $license->installations()->whereNull('revoked_at')->get();
        if (! $existing && $activeInstallations->count() >= $license->max_installations && ! ($data['replace_installation'] ?? false)) {
            return response()->json(['message' => 'Lisensi sudah digunakan pada perangkat lain.', 'code' => 'installation_limit', 'devices' => $activeInstallations->map(fn ($item) => ['name' => $item->device_name ?: 'Perangkat tidak dikenal', 'last_online_at' => $item->last_online_at?->toIso8601String()])], 409);
        }
        if (! $existing && ($data['replace_installation'] ?? false)) {
            [$installation, $token] = $service->replaceActiveInstallation($license, $data['installation_id'], $data['device_name'] ?? null);
            AdminAuditLog::create(['action' => 'client.installation_replaced', 'entity_type' => User::class, 'entity_id' => $user->id, 'metadata' => ['license_id' => $license->id, 'installation_id' => $installation->id], 'ip_address' => $request->ip(), 'user_agent' => $request->userAgent(), 'created_at' => now()]);
        } else {
            [$installation, $token] = $service->activate($license, $data['installation_id'], $data['device_name'] ?? null);
        }

        return response()->json(['token' => $token, 'user' => $user->only('uuid', 'name', 'email'), 'license' => ['uuid' => $license->uuid, 'status' => $license->status, 'product' => $license->product->name, 'issued_at' => $license->issued_at?->toIso8601String()], 'installation' => ['uuid' => $installation->uuid, 'identifier' => $installation->installation_identifier]]);
    }

    public function verify(Request $request): JsonResponse
    {
        $token = $request->bearerToken();
        $installation = $token ? Installation::with('license.user')->where('token_hash', hash('sha256', $token))->first() : null;
        if (! $installation || $installation->revoked_at || $installation->license->status !== 'active' || $installation->license->user->status !== 'active') {
            return response()->json(['valid' => false], 401);
        }
        $installation->update(['last_online_at' => now()]);

        return response()->json(['valid' => true, 'checked_at' => now()->toIso8601String()]);
    }
}
