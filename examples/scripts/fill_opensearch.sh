# Set variables for OpenSearch endpoint and index name
ENDPOINT="https://localhost:9200"
INDEX_NAME="demo_index"

# Create the index with a mapping for the document fields
curl -XPUT "$ENDPOINT/$INDEX_NAME" -u 'admin:admin' --insecure -H 'Content-Type: application/json' -d '{
  "mappings": {
    "properties": {
      "name": { "type": "text" },
      "address": { "type": "text" },
      "email": { "type": "keyword" }
    }
  }
}'

# Add some dummy documents to the index
curl -XPOST "$ENDPOINT/$INDEX_NAME/_bulk" -u 'admin:admin' --insecure -H 'Content-Type: application/json' -d '
{ "index": {} }
{ "name": "John Doe", "address": "123 Main St", "email": "john@example.com" }
{ "index": {} }
{ "name": "Jane Smith", "address": "456 Oak Ave", "email": "jane@example.com" }
{ "index": {} }
{ "name": "Bob Johnson", "address": "789 Maple Dr", "email": "bob@example.com" }
'