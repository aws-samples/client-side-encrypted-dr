# MySQL/MariaDB Restore from S3 Construct

The MySQL/MariaDB Restore from S3 Construct is a part of the AWS Disaster Recovery Samples repository. This construct allows you to restore a MySQL or MariaDB database from an encrypted backup stored in Amazon S3. By using this construct, you can set up a disaster recovery configuration that complies with data protection regulations.

## How to Use

To use the MySQL/MariaDB Restore from S3 Construct, follow the instructions below:

1. Instantiate the `MysqlRestoreFromS3` construct in your CDK stack, providing the necessary parameters:

```typescript
new MysqlRestoreFromS3(this, "MysqlRestore", {
  name: String,
  vpc: cdk.aws_ec2.Vpc,
  secretName: String,
  s3BucketName: String,
  s3ObjectKey: String,
  stagingSubnets: {subnetType: cdk.aws_ec2.SubnetType},
  stagingInstanceRole: cdk.aws_iam.Role,
  targetDatabase: cdk.aws_rds.Database
});
```

2. Customize the following parameters according to your environment:

- `name`: A descriptive name for the database restore configuration.
- `vpc`: The VPC (Amazon Virtual Private Cloud) where the database will be restored.
- `secretName`: The name of the AWS Secrets Manager secret that contains the encryption key needed for decryption.
The scecret value should look like this:
```typescript
{
  "EncryptionKey": "3397b8e5854d41e8689dabc280166"
}
```
- `s3BucketName`: The name of the Amazon S3 bucket where the encrypted backup is stored.
- `s3ObjectKey`: The key of the encrypted backup object within the Amazon S3 bucket.
- `stagingSubnets`: The subnets to be used for the staging instance. Specify the subnet type (e.g., `SubnetType.PUBLIC`).
- `stagingInstanceRole`: The IAM role that allows the staging instance to read the encrypted backup from Amazon S3.
- `targetDatabase`: The RDS database instance (MySQL or MariaDB) where the restored data will be placed.

3. Ensure that the `stagingInstanceRole` has appropriate permissions to read the encrypted backup from the specified Amazon S3 bucket.

4. Deploy the CDK stack, and the MySQL/MariaDB database will be restored from the encrypted backup stored in Amazon S3. Logs will be stored in a CloudWatch logs group called `db-restore`

## Notes

- The MySQL/MariaDB Restore from S3 Construct assumes that you have an existing Amazon RDS database instance (MySQL or MariaDB) where the restored data will be placed.

## Examples

To see a practical example of using the MySQL/MariaDB Restore from S3 Construct, refer to the `examples` folder in this repository. The example CDK stack provides step-by-step instructions and a working configuration to help you get started.