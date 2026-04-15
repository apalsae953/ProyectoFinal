FROM php:8.2-apache

# Install dependencies for PostgreSQL and useful tools
RUN apt-get update && apt-get install -y \
    libpq-dev \
    unzip \
    zip \
    && docker-php-ext-install pdo pdo_pgsql

# Enable Apache mod_rewrite for Laravel
RUN a2enmod rewrite

# Install Composer
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Set working directory
WORKDIR /var/www/html

# Copy the Laravel project files
COPY . /var/www/html

# Point Apache DocumentRoot to the public folder
RUN sed -i 's!/var/www/html!/var/www/html/public!g' /etc/apache2/sites-available/000-default.conf
RUN echo '<Directory /var/www/html/public>\n    AllowOverride All\n    Require all granted\n</Directory>' >> /etc/apache2/apache2.conf

# Modify Apache to listen on $PORT instead of 80 (Required by Render)
RUN sed -i 's/Listen 80/Listen ${PORT}/g' /etc/apache2/ports.conf
RUN sed -i 's/<VirtualHost \*:80>/<VirtualHost *:${PORT}>/g' /etc/apache2/sites-available/000-default.conf

# Give Permissions to Laravel cache and storage
RUN chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache \
    && chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

# Run composer install
# ENV COMPOSER_ALLOW_SUPERUSER=1
RUN composer install --no-dev --optimize-autoloader

# Expose port (Render sets it to 10000 by default)
EXPOSE 10000

# Start command
CMD ["apache2-foreground"]
