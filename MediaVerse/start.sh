#!/bin/bash
set -e

php artisan migrate --force
php artisan db:seed --class=TriviaSeeder --force

exec apache2-foreground
