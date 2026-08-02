<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminAuditLog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\View\View;

class AuthController extends Controller
{
    public function create(): View
    {
        return view('admin.auth.login');
    }

    public function store(Request $request): RedirectResponse
    {
        $credentials = $request->validate(['email' => ['required', 'email'], 'password' => ['required', 'string']]);
        $credentials['is_active'] = true;
        if (! Auth::guard('admin')->attempt($credentials, $request->boolean('remember'))) {
            return back()->withErrors(['email' => 'Email atau password admin tidak valid.'])->onlyInput('email');
        }
        $request->session()->regenerate();
        $admin = Auth::guard('admin')->user();
        $admin->forceFill(['last_login_at' => now()])->save();
        AdminAuditLog::create(['admin_id' => $admin->id, 'action' => 'admin.login', 'entity_type' => 'admin', 'entity_id' => (string) $admin->id, 'ip_address' => $request->ip(), 'user_agent' => $request->userAgent(), 'created_at' => now()]);

        return redirect()->intended(route('admin.dashboard'));
    }

    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('admin')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('admin.login');
    }
}
