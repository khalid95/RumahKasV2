<?php

test('the RumahKas application shell and module routes are available', function () {
    foreach (['/', '/transactions', '/accounts', '/categories', '/budgets', '/saving-goals', '/planner', '/habits', '/reports', '/backup', '/settings'] as $route) {
        $this->get($route)->assertOk()->assertSee('RumahKas');
    }
});

test('the PWA assets are publicly available', function () {
    expect(public_path('manifest.webmanifest'))->toBeFile()
        ->and(public_path('service-worker.js'))->toBeFile()
        ->and(public_path('offline.html'))->toBeFile()
        ->and(public_path('icons/rumahkas-192.png'))->toBeFile()
        ->and(public_path('icons/rumahkas-512.png'))->toBeFile();
});

test('local-first category and account pages use their real module views', function () {
    $this->get('/categories')->assertOk()->assertSee('data-category-page', false);
    $this->get('/accounts')->assertOk()->assertSee('data-account-page', false);
    $this->get('/transactions')->assertOk()->assertSee('data-transaction-page', false);
    $this->get('/budgets')->assertOk()->assertSee('data-budget-page', false);
    $this->get('/reports')->assertOk()->assertSee('data-report-page', false);
});
