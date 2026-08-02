<?php

use App\Models\Admin;
use App\Models\AdminAuditLog;
use App\Models\Payment;
use App\Models\Product;
use App\Models\User;
use App\Services\LicenseService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

test('commercial platform schema is isolated from financial data', function () {
    foreach (['admins', 'products', 'payments', 'licenses', 'installations', 'admin_audit_logs'] as $table) {
        expect(Schema::hasTable($table))->toBeTrue();
    }
    expect(Schema::hasColumns('users', ['uuid', 'status']))->toBeTrue();
    expect(Schema::hasTable('transactions'))->toBeFalse();
    expect(Schema::hasTable('financial_accounts'))->toBeFalse();
});

test('models receive UUID automatically', function () {
    $user = User::factory()->create();
    $product = Product::create(['code' => 'test-product', 'name' => 'Test', 'version_entitlement' => '1.x', 'price' => 100000, 'is_active' => true]);
    expect($user->uuid)->toBeUuid()->and($product->uuid)->toBeUuid();
});

test('admin pages require the separate admin guard', function () {
    $this->get('/admin')->assertRedirect(route('admin.login'));
    $this->get('/admin/users')->assertRedirect(route('admin.login'));
    $this->get('/admin/login')->assertOk()->assertSee('Panel Admin');
});

test('active admin can login and an audit record is created', function () {
    $admin = Admin::create(['name' => 'Owner', 'email' => 'owner@example.com', 'password' => Hash::make('very-secure-password'), 'role' => 'super_admin', 'is_active' => true]);
    $response = $this->post('/admin/login', ['email' => 'owner@example.com', 'password' => 'very-secure-password']);
    $response->assertRedirect(route('admin.dashboard'));
    $this->assertAuthenticatedAs($admin, 'admin');
    expect($admin->fresh()->last_login_at)->not->toBeNull();
    expect(AdminAuditLog::where('action', 'admin.login')->where('admin_id', $admin->id)->exists())->toBeTrue();
    $this->get('/admin')->assertOk()->assertSee('Pembayaran Terbaru');
});

test('inactive admin cannot login', function () {
    Admin::create(['name' => 'Inactive', 'email' => 'inactive@example.com', 'password' => Hash::make('very-secure-password'), 'role' => 'admin', 'is_active' => false]);
    $this->post('/admin/login', ['email' => 'inactive@example.com', 'password' => 'very-secure-password'])
        ->assertSessionHasErrors('email');
    $this->assertGuest('admin');
});

test('paid customer can activate and verify a licensed device', function () {
    $user = User::factory()->create(['status' => 'active', 'password' => 'customer-password']);
    $product = Product::create(['code' => 'lifetime', 'name' => 'Lifetime', 'version_entitlement' => '1.x', 'price' => 299000, 'is_active' => true]);
    $payment = Payment::create(['user_id' => $user->id, 'product_id' => $product->id, 'provider' => 'manual', 'amount' => 299000, 'status' => 'paid', 'paid_at' => now()]);
    app(LicenseService::class)->issueForPayment($payment);
    $activation = $this->postJson('/api/client/login', ['email' => $user->email, 'password' => 'customer-password', 'installation_id' => fake()->uuid(), 'device_name' => 'Test Phone'])->assertOk()->json();
    expect($activation['token'])->not->toBeEmpty()->and($activation['license']['status'])->toBe('active');
    $this->withToken($activation['token'])->getJson('/api/client/verify')->assertOk()->assertJson(['valid' => true]);
});

test('customer can replace an active installation after confirmation', function () {
    $user = User::factory()->create(['status' => 'active', 'password' => 'customer-password']);
    $product = Product::create(['code' => 'replace-test', 'name' => 'Lifetime', 'version_entitlement' => '1.x', 'price' => 299000, 'is_active' => true]);
    $payment = Payment::create(['user_id' => $user->id, 'product_id' => $product->id, 'provider' => 'manual', 'amount' => 299000, 'status' => 'paid', 'paid_at' => now()]);
    app(LicenseService::class)->issueForPayment($payment);
    $credentials = ['email' => $user->email, 'password' => 'customer-password', 'device_name' => 'HP Lama'];
    $old = $this->postJson('/api/client/login', [...$credentials, 'installation_id' => fake()->uuid()])->assertOk()->json();
    $newIdentifier = fake()->uuid();
    $this->postJson('/api/client/login', [...$credentials, 'installation_id' => $newIdentifier])->assertStatus(409)->assertJson(['code' => 'installation_limit']);
    $new = $this->postJson('/api/client/login', [...$credentials, 'installation_id' => $newIdentifier, 'device_name' => 'HP Baru', 'replace_installation' => true])->assertOk()->json();
    $this->withToken($old['token'])->getJson('/api/client/verify')->assertUnauthorized();
    $this->withToken($new['token'])->getJson('/api/client/verify')->assertOk()->assertJson(['valid' => true]);
    expect(AdminAuditLog::where('action', 'client.installation_replaced')->where('entity_id', $user->id)->exists())->toBeTrue();
});
