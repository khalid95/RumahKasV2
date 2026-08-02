<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('installations', function (Blueprint $table) {
            $table->string('token_hash', 64)->nullable()->unique()->after('installation_identifier');
        });
    }

    public function down(): void
    {
        Schema::table('installations', fn (Blueprint $table) => $table->dropColumn('token_hash'));
    }
};
