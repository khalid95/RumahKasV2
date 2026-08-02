#!/bin/sh
set -eu

if [ "${DB_CONNECTION:-mysql}" = "mysql" ]; then
    echo "Menunggu MySQL siap..."
    attempt=0
    until php -r '
        try {
            new PDO(
                "mysql:host=" . getenv("DB_HOST") . ";port=" . (getenv("DB_PORT") ?: "3306") . ";dbname=" . getenv("DB_DATABASE"),
                getenv("DB_USERNAME"),
                getenv("DB_PASSWORD"),
                [PDO::ATTR_TIMEOUT => 3]
            );
        } catch (Throwable $exception) {
            exit(1);
        }
    '; do
        attempt=$((attempt + 1))
        if [ "$attempt" -ge 30 ]; then
            echo "MySQL tidak siap setelah 30 percobaan." >&2
            exit 1
        fi
        sleep 2
    done
fi

mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache

php artisan migrate --force --no-interaction
php artisan optimize:clear
php artisan config:cache
php artisan event:cache
php artisan route:cache
php artisan view:cache

exec "$@"

