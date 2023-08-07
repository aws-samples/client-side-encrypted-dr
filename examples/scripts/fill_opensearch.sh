#!/bin/bash

# Read parameters
read -p "Enter the OpenSearch endpoint URL (default is https://localhost:9200): " ENDPOINT
ENDPOINT=${ENDPOINT:-https://localhost:9200}
read -p "Enter the name of the index to create (default 'people'): " INDEX_NAME
INDEX_NAME=${INDEX_NAME:-people}
read -p "Enter the OpenSearch username (default is admin): " USERNAME
USERNAME=${USERNAME:-admin}
read -s -p "Enter the OpenSearch password (default is admin): " PASSWORD
PASSWORD=${PASSWORD:-admin}


# Create the index with a mapping for the document fields
curl -XPUT "$ENDPOINT/$INDEX_NAME" -u "${USERNAME}:${PASSWORD}" --insecure -H 'Content-Type: application/json' -d '{
  "mappings": {
    "properties": {
      "name": { "type": "text" },
      "address": { "type": "text" },
      "email": { "type": "keyword" }
    }
  }
}'

# Add some dummy documents to the index
curl -XPOST "$ENDPOINT/$INDEX_NAME/_bulk" --u "${USERNAME}:${PASSWORD}" --insecure -H 'Content-Type: application/json' -d '
{ "index": {} }
{ "name": "John Doe", "address": "123 Main St", "email": "john@example.com" }
{ "index": {} }
{ "name": "Jane Smith", "address": "456 Oak Ave", "email": "jane@example.com" }
{ "index": {} }
{ "name": "Bob Johnson", "address": "789 Maple Dr", "email": "bob@example.com" }
'