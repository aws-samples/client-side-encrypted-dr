#!/bin/bash

# Start timing
start=$(date +%s.%N)

# Read config file
. /opt/restore.config

# Get the secret value from AWS Secrets Manager
echo "Retrieving target database credentials from AWS Secrets Manager..."
DB_SECRET_VALUE=$(aws secretsmanager get-secret-value --secret-id $DB_SECRET_NAME --region $REGION --query SecretString --output text)

# Decode the secret value from JSON to Bash variables
while IFS= read -r line; do
  export "$line"
done < <(jq -r 'to_entries|map("\(.key)=\(.value|tostring)")|.[]' <<< "$DB_SECRET_VALUE")

# Get encryption key from AWS Secrets Manager
echo "Retrieving encryption key from AWS Secrets Manager..."
KEY=$(aws secretsmanager get-secret-value --secret-id $CRYPTO_SECRET_NAME --region $REGION --query SecretString --output text |jq -r .EncryptionKey)

# Get backup from S3, decrypt and import to database
echo "Starting to restore the backup..."
aws s3 cp s3://$BACKUP_S3_BUCKET/$BACKUP_S3_KEY - | gpg --batch --passphrase "$KEY" --decrypt | mysql -u $username -p$password -h $host

# End timing
end=$(date +%s.%N)

# Calculate elapsed time
elapsed=$(echo "$end - $start" | bc)

# Print elapsed time
echo "Restore completed after $elapsed seconds. Shuttding down staging instance..."

# Sleep 30 seconds to allow the CloudWatch Agent to send to logs
sleep 30

# Shutdown Instance after completion
shutdown -h now