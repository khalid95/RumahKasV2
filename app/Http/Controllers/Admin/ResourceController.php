<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminAuditLog;
use App\Models\Installation;
use App\Models\License;
use App\Models\Payment;
use App\Models\Product;
use App\Models\User;
use App\Services\LicenseService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\View\View;

class ResourceController extends Controller
{
    public function users(Request $request): View
    {
        $users = User::withCount(['payments', 'licenses'])->when($request->q, fn ($q, $term) => $q->where(fn ($q) => $q->where('name', 'like', "%{$term}%")->orWhere('email', 'like', "%{$term}%")))->latest()->paginate(20)->withQueryString();

        return view('admin.users.index', compact('users'));
    }

    public function storeUser(Request $request): RedirectResponse
    {
        $data = $request->validate(['name' => 'required|string|max:100', 'email' => 'required|email|max:255|unique:users', 'password' => 'required|string|min:8|confirmed', 'status' => ['required', Rule::in(['active', 'suspended'])]]);
        $user = User::create($data);
        $this->audit($request, 'user.created', $user);

        return back()->with('success', 'Pengguna berhasil dibuat.');
    }

    public function updateUser(Request $request, User $user): RedirectResponse
    {
        $data = $request->validate(['name' => 'required|string|max:100', 'email' => ['required', 'email', 'max:255', Rule::unique('users')->ignore($user)], 'status' => ['required', Rule::in(['active', 'suspended'])], 'password' => 'nullable|string|min:8|confirmed']);
        if (empty($data['password'])) {
            unset($data['password']);
        }
        $user->update($data);
        $this->audit($request, 'user.updated', $user);

        return back()->with('success', 'Pengguna berhasil diperbarui.');
    }

    public function payments(Request $request): View
    {
        $payments = Payment::with(['user', 'product', 'license'])->when($request->status, fn ($q, $status) => $q->where('status', $status))->latest()->paginate(20)->withQueryString();

        return view('admin.payments.index', ['payments' => $payments, 'users' => User::where('status', 'active')->orderBy('name')->get(), 'products' => Product::where('is_active', true)->get()]);
    }

    public function storePayment(Request $request, LicenseService $licenses): RedirectResponse
    {
        $data = $request->validate(['user_id' => 'required|exists:users,id', 'product_id' => 'required|exists:products,id', 'provider' => 'required|string|max:50', 'provider_reference' => 'nullable|string|max:100|unique:payments', 'amount' => 'required|integer|min:0', 'status' => ['required', Rule::in(['pending', 'paid', 'failed', 'refunded'])]]);
        $data['paid_at'] = $data['status'] === 'paid' ? now() : null;
        $payment = Payment::create($data);
        if ($payment->status === 'paid') {
            $licenses->issueForPayment($payment);
        }
        $this->audit($request, 'payment.created', $payment);

        return back()->with('success', 'Pembayaran berhasil dicatat'.($payment->status === 'paid' ? ' dan lisensi diterbitkan.' : '.'));
    }

    public function updatePayment(Request $request, Payment $payment, LicenseService $licenses): RedirectResponse
    {
        $data = $request->validate(['status' => ['required', Rule::in(['pending', 'paid', 'failed', 'refunded'])]]);
        $payment->update(['status' => $data['status'], 'paid_at' => $data['status'] === 'paid' ? ($payment->paid_at ?: now()) : $payment->paid_at]);
        if ($payment->status === 'paid') {
            $licenses->issueForPayment($payment);
        }
        if ($payment->status === 'refunded') {
            $payment->license?->update(['status' => 'revoked', 'revoked_at' => now()]);
        }
        $this->audit($request, 'payment.updated', $payment);

        return back()->with('success', 'Status pembayaran diperbarui.');
    }

    public function licenses(): View
    {
        return view('admin.licenses.index', ['licenses' => License::with(['user', 'product', 'installations'])->latest()->paginate(20)]);
    }

    public function updateLicense(Request $request, License $license): RedirectResponse
    {
        $data = $request->validate(['status' => ['required', Rule::in(['active', 'revoked'])], 'max_installations' => 'required|integer|min:1|max:10']);
        $license->update([...$data, 'revoked_at' => $data['status'] === 'revoked' ? now() : null]);
        if ($data['status'] === 'revoked') {
            $license->installations()->update(['revoked_at' => now(), 'token_hash' => null]);
        }
        $this->audit($request, 'license.updated', $license);

        return back()->with('success', 'Lisensi berhasil diperbarui.');
    }

    public function installations(): View
    {
        return view('admin.installations.index', ['installations' => Installation::with('license.user')->latest()->paginate(20)]);
    }

    public function updateInstallation(Request $request, Installation $installation): RedirectResponse
    {
        $active = $request->boolean('active');
        $installation->update(['revoked_at' => $active ? null : now(), 'token_hash' => $active ? $installation->token_hash : null]);
        $this->audit($request, $active ? 'installation.activated' : 'installation.revoked', $installation);

        return back()->with('success', 'Status perangkat diperbarui.');
    }

    private function audit(Request $request, string $action, $entity): void
    {
        AdminAuditLog::create(['admin_id' => auth('admin')->id(), 'action' => $action, 'entity_type' => $entity::class, 'entity_id' => $entity->getKey(), 'ip_address' => $request->ip(), 'user_agent' => $request->userAgent(), 'created_at' => now()]);
    }
}
