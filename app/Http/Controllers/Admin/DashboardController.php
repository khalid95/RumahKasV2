<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Installation;
use App\Models\License;
use App\Models\Payment;
use App\Models\User;
use Illuminate\View\View;

class DashboardController extends Controller
{
    public function __invoke(): View
    {
        return view('admin.dashboard', [
            'metrics' => [
                'users' => User::count(),
                'paidRevenue' => Payment::where('status', 'paid')->sum('amount'),
                'activeLicenses' => License::where('status', 'active')->count(),
                'activeInstallations' => Installation::whereNull('revoked_at')->count(),
            ],
            'recentPayments' => Payment::with(['user', 'product'])->latest()->limit(8)->get(),
        ]);
    }
}
