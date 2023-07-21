#!/bin/bash

# Read parameters
read -p "Enter the OpenSearch endpoint URL (default is https://localhost:9200): " ENDPOINT
ENDPOINT=${ENDPOINT:-https://localhost:9200}
read -p "Enter the name of the index to back up: " INDEX_NAME
read -p "Enter the OpenSearch username (default is admin): " USERNAME
USERNAME=${USERNAME:-admin}
read -s -p "Enter the OpenSearch password (default is admin): " PASSWORD
PASSWORD=${PASSWORD:-admin}

echo ""

# Set SNAPSHOT_NAME and SNAPSHOT_REPO_NAME based on INDEX_NAME
SNAPSHOT_NAME="${INDEX_NAME}-$(date +"%Y%m%d%H%M%S")"
SNAPSHOT_REPO_NAME="${INDEX_NAME}_backups"

# Read passphrase
read -s -p "Enter a passphrase to encrypt the backup: " PASSPHRASE

# Create the snapshot repository
curl -XPUT --insecure -u "${USERNAME}:${PASSWORD}" "${ENDPOINT}/_snapshot/${SNAPSHOT_REPO_NAME}" -H 'Content-Type: application/json' -d '{
  "type": "fs",
  "settings": {
    "location": "/mnt/backups"
  }
}'

# Create the snapshot
curl -XPUT --insecure -u "${USERNAME}:${PASSWORD}" "${ENDPOINT}/_snapshot/${SNAPSHOT_REPO_NAME}/${SNAPSHOT_NAME}?wait_for_completion=true" -H 'Content-Type: application/json' -d '{
  "indices": "'"$INDEX_NAME"'",
  "ignore_unavailable": true,
  "include_global_state": false
}'

# Compress the snapshot and encrypt it
(cd /mnt/backups/; tar cz .)| gpg --batch --yes --symmetric --passphrase "${PASSPHRASE}" -o "${SNAPSHOT_NAME}.tar.gz.gpg"