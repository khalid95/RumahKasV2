<?php

namespace Database\Seeders;

use App\Models\Admin;
use App\Models\Product;
use Illuminate\Database\Seeder;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        Product::query()->updateOrCreate(['code' => 'rumahkas-lifetime'], [
            'name' => 'RumahKas Lifetime',
            'version_entitlement' => '1.x',
            'price' => 299000,
            'is_active' => true,
        ]);

        if ($password = env('ADMIN_PASSWORD')) {
            Admin::query()->updateOrCreate(['email' => env('ADMIN_EMAIL', 'admin@rumahkas.test')], [
                'name' => env('ADMIN_NAME', 'RumahKas Admin'),
                'password' => Hash::make($password),
                'role' => 'super_admin',
                'is_active' => true,
            ]);
        }
    }
}
