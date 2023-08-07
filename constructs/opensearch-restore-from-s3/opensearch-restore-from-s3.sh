#!/bin/bash

# Timeout - allows you to specify a maximum time for restore process
timeout_value=6000  # Change this to the desired number of seconds. Default 1 hour

# Start timing
start=$(date +%s.%N)

# Import config
source /opt/restore.config

# Set variables
REPO_NAME="opensearch-backup"
export DEST_BUCKET="$SOURCE_BUCKET" # use the same bucket to temporarily store the unencrypted backup
export DEST_KEY="decrypted/"

# Get encryption key from AWS Secrets Manager
echo "Retrieving encryption key from AWS Secrets Manager..."
KEY=$(aws secretsmanager get-secret-value --secret-id $CRYPTO_SECRET_NAME --region $REGION --query SecretString --output text |jq -r .EncryptionKey)

# Decrypt backup 
echo "Decrypting backup..."
aws s3 cp "s3://${SOURCE_BUCKET}/${SOURCE_KEY}" - | gpg --batch --quiet --decrypt --passphrase "${KEY}" | tar xz --to-command 'aws s3 cp - s3://${DEST_BUCKET}/${DEST_KEY}${TAR_REALNAME#./}'

# Get temp credentials for awscurl
TOKEN=`curl -s -X PUT "http://169.254.169.254/latest/api/token" -H "X-aws-ec2-metadata-token-ttl-seconds: 21600"` 
ROLE_NAME=`curl -H "X-aws-ec2-metadata-token: $TOKEN"  --silent http://169.254.169.254/latest/meta-data/iam/security-credentials/`
CREDENTIALS=`curl -H "X-aws-ec2-metadata-token: $TOKEN"  --silent -XGET http://169.254.169.254/latest/meta-data/iam/security-credentials/$ROLE_NAME`

ACCESS_KEY=$(echo $CREDENTIALS | jq -r '.AccessKeyId')
SECRET_ACCESS_KEY=$(echo $CREDENTIALS | jq -r '.SecretAccessKey')
TOKEN=$(echo $CREDENTIALS | jq -r '.Token')

# Configure temp credentials as profile so awsurl can use them
aws configure set aws_session_token "$TOKEN" --profile temp
aws configure set aws_access_key_id "$ACCESS_KEY" --profile temp
aws configure set aws_secret_access_key "$SECRET_ACCESS_KEY" --profile temp

# Register Repository
echo "Registering repository"
awscurl --profile temp --service es --region $REGION -XPUT "$DOMAIN_ENDPOINT/_snapshot/$REPO_NAME" -H 'Content-Type: application/json' --data '{
    "type": "s3",
    "settings": 
        {
            "bucket": "'$DEST_BUCKET'",
            "readonly": true,
            "base_path": "'$DEST_KEY'",
            "region": "'$REGION'",
            "role_arn":"'$SNAPSHOT_ROLE'"
        }
}'

# Get latest snapshot from repository
SNAPSHOTS=`awscurl --profile temp --service es --region $REGION -XGET "$DOMAIN_ENDPOINT/_snapshot/$REPO_NAME/_all"`
LATEST_SNAPSHOT=$(echo "$SNAPSHOTS" | jq -r '.snapshots | sort_by(.start_time_in_millis) | reverse | .[0].snapshot')

# Restore Backup
echo "Restoring backup..."
awscurl --profile temp --service es --region $REGION -XPOST "$DOMAIN_ENDPOINT/_snapshot/$REPO_NAME/$LATEST_SNAPSHOT/_restore"

# Wait for restore to complete
while : ; do
    output=$(awscurl --profile temp --service es --region $REGION -XGET "$DOMAIN_ENDPOINT/_cat/recovery")
    echo "$output"
    if [[ $output == *"done"* ]]; then
        echo "Restore completed."
        break
    fi
    sleep 10
done &  # Run the loop in the background

# Wait for the loop to complete or be interrupted by the timeout
if ! timeout "$timeout_value" bash -c "wait $!"; then
    echo "Timeout reached. Restore did not complete within $timeout_value seconds."
fi

echo "Snapshot restore complete!"


# Unregister repository
echo "Unregistering repository..."
awscurl --profile temp --service es --region $REGION -XDELETE "$DOMAIN_ENDPOINT/_snapshot/$REPO_NAME"

# Delete unencrypted backup
echo "Deleting backup..."
aws s3 rm "s3://${DEST_BUCKET}/${DEST_KEY}" --recursive

# Print elapsed time
echo "Restore completed after $elapsed seconds. Shuttding down staging instance..."

# Sleep 30 seconds to allow the CloudWatch Agent to send to logs
sleep 30

# Shutdown Instance after completion
shutdown -h now