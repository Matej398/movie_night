#!/bin/bash

# SSL Certificate Setup Script
# Run this on your VPS as root after DNS is configured

echo "=== SSL Certificate Setup ==="
echo ""

# Configuration - Your 5 projects
SUBDOMAINS=(
    "movie-night.codelabhaven.com"
    "nyan.codelabhaven.com"
    "cmdhub.codelabhaven.com"
    "pixly.codelabhaven.com"
    "deployment-guide.codelabhaven.com"
)

# Project paths (for reference - not used in SSL setup)
declare -A PROJECT_PATHS=(
    ["movie-night.codelabhaven.com"]="/var/www/html/codelabhaven/projects/movie_night"
    ["nyan.codelabhaven.com"]="/var/www/html/codelabhaven/projects/nyan"
    ["cmdhub.codelabhaven.com"]="/var/www/html/codelabhaven/projects/cmdhub"
    ["pixly.codelabhaven.com"]="/var/www/html/codelabhaven/projects/pixly"
    ["deployment-guide.codelabhaven.com"]="/var/www/html/codelabhaven/projects/deployment_guide"
)

# Check if certbot is installed
if ! command -v certbot &> /dev/null; then
    echo "Installing certbot..."
    apt-get update
    apt-get install -y certbot python3-certbot-apache python3-certbot-nginx
fi

# Detect web server
if command -v apache2 &> /dev/null; then
    WEB_SERVER="apache"
elif command -v nginx &> /dev/null; then
    WEB_SERVER="nginx"
else
    echo "Error: Neither Apache nor Nginx found!"
    exit 1
fi

echo "Detected web server: $WEB_SERVER"
echo ""

# Get email for Certbot
read -p "Enter your email address for SSL certificate notifications: " EMAIL
if [ -z "$EMAIL" ]; then
    echo "Error: Email address is required"
    exit 1
fi

# Option 1: Wildcard certificate (requires DNS TXT record)
echo ""
echo "Option 1: Wildcard Certificate"
echo "This will create one certificate for *.codelabhaven.com"
echo "⚠️  Requires adding a DNS TXT record for validation"
echo ""
echo "Option 2: Individual Certificates (Easier - Recommended)"
echo "This will create separate certificates for each subdomain"
echo "✓ No DNS TXT records needed - uses HTTP validation"
echo ""
read -p "Use wildcard certificate? (y/n, default=n): " use_wildcard

if [ "$use_wildcard" == "y" ] || [ "$use_wildcard" == "Y" ]; then
    echo ""
    echo "Setting up wildcard certificate..."
    echo "You'll need to add a TXT record to your DNS for domain validation"
    echo ""
    
    if [ "$WEB_SERVER" == "apache" ]; then
        certbot certonly --manual --preferred-challenges dns \
            -d "*.codelabhaven.com" -d "codelabhaven.com" \
            --server https://acme-v02.api.letsencrypt.org/directory
    else
        certbot certonly --manual --preferred-challenges dns \
            -d "*.codelabhaven.com" -d "codelabhaven.com" \
            --server https://acme-v02.api.letsencrypt.org/directory
    fi
    
    echo ""
    echo "After certificate is obtained, update your virtual hosts to use SSL"
    echo "See update_ssl_configs.sh for automated SSL config updates"
else
    # Option 2: Individual certificates for each subdomain
    echo ""
    echo "Setting up individual certificates for each subdomain..."
    echo ""
    
    for domain in "${SUBDOMAINS[@]}"; do
        echo "Setting up SSL for $domain..."
        
        if [ "$WEB_SERVER" == "apache" ]; then
            certbot --apache -d "$domain" --non-interactive --agree-tos --email "$EMAIL" --redirect
        else
            certbot --nginx -d "$domain" --non-interactive --agree-tos --email "$EMAIL" --redirect
        fi
        
        echo "✓ SSL configured for $domain"
        echo ""
    done
fi

echo ""
echo "=== SSL Setup Complete ==="
echo ""

