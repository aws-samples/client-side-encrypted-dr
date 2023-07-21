#!/bin/bash

# Prompt for database parameters
read -p "Enter database name: " DB_NAME
read -p "Enter database hostname: " DB_HOST
read -s -p "Enter database user: " DB_USER
read -s -p "Enter database password: " DB_PASSWORD
echo ""

# Prompt for encryption password
read -s -p "Enter encryption password: " ENCRYPTION_PASSWORD
echo ""

# Set the filename for the backup
FILENAME="${DB_NAME}_$(date '+%Y%m%d_%H%M%S').sql.gpg"

# Set the port to the default MySQL port if not provided
if [ -z "$DB_PORT" ]; then
  DB_PORT=3306
fi

# Connect to the MySQL database, create a backup, and encrypt it using GPG
mysqldump --single-transaction --quick --lock-tables=false --add-drop-database --host=$DB_HOST --user=$DB_USER --password=$DB_PASSWORD --databases $DB_NAME | gpg --batch --yes --symmetric --passphrase="$ENCRYPTION_PASSWORD" -o $FILENAME

echo "Backup created and encrypted successfully. Shutting down staging instance..."

shutdown -h now