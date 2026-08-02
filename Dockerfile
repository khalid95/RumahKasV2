# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS frontend
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci
COPY resources ./resources
COPY public ./public
COPY scripts ./scripts
COPY vite.config.js release-notes.json ./
RUN npm run build

FROM php:8.3-fpm-alpine AS php-base
RUN apk add --no-cache icu-libs libzip oniguruma \
    && apk add --no-cache --virtual .build-deps $PHPIZE_DEPS icu-dev libzip-dev oniguruma-dev \
    && docker-php-ext-install -j"$(nproc)" bcmath intl mbstring opcache pdo_mysql zip \
    && apk del .build-deps
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
WORKDIR /var/www/html

FROM php-base AS vendor
COPY composer.json composer.lock ./
RUN composer install \
    --no-dev \
    --no-interaction \
    --no-scripts \
    --prefer-dist \
    --optimize-autoloader

FROM php-base AS application
COPY . .
COPY --from=vendor /var/www/html/vendor ./vendor
COPY --from=frontend /build/public/build ./public/build
COPY --from=frontend /build/public/release.json ./public/release.json
COPY --from=frontend /build/public/service-worker.js ./public/service-worker.js
COPY docker/php/production.ini /usr/local/etc/php/conf.d/production.ini
COPY docker/php/entrypoint.sh /usr/local/bin/rumahkas-entrypoint
RUN composer dump-autoload --no-dev --optimize --no-interaction \
    && chmod +x /usr/local/bin/rumahkas-entrypoint \
    && mkdir -p storage/framework/cache storage/framework/sessions storage/framework/views storage/logs bootstrap/cache \
    && chown -R www-data:www-data storage bootstrap/cache
ENTRYPOINT ["rumahkas-entrypoint"]
CMD ["php-fpm", "-F"]

FROM nginx:1.27-alpine AS web
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=application /var/www/html/public /var/www/html/public
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget --quiet --spider http://127.0.0.1/up || exit 1
