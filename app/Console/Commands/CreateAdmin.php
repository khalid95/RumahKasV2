<?php

namespace App\Console\Commands;

use App\Models\Admin;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Hash;

class CreateAdmin extends Command
{
    protected $signature = 'admin:create {--name=} {--email=}';

    protected $description = 'Membuat atau memperbarui akun administrator RumahKas';

    public function handle(): int
    {
        $name = $this->option('name') ?: $this->ask('Nama admin', 'RumahKas Admin');
        $email = $this->option('email') ?: $this->ask('Email admin');
        if (! filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $this->error('Format email tidak valid.');

            return self::FAILURE;
        }

        $password = $this->secret('Password (minimal 12 karakter)');
        $confirmation = $this->secret('Konfirmasi password');
        if (strlen((string) $password) < 12 || $password !== $confirmation) {
            $this->error('Password harus minimal 12 karakter dan konfirmasinya harus sama.');

            return self::FAILURE;
        }

        $admin = Admin::query()->firstOrNew(['email' => mb_strtolower($email)]);
        $admin->fill(['name' => $name, 'password' => Hash::make($password), 'role' => 'super_admin', 'is_active' => true])->save();
        $this->info("Admin {$admin->email} siap digunakan.");

        return self::SUCCESS;
    }
}
