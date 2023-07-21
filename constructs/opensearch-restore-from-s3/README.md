# OpenSearch Restore from S3 Construct

The OpenSearch Restore from S3 Construct is a part of the AWS Disaster Recovery Samples repository. This construct allows you to restore an OpenSearch domain from an encrypted backup stored in Amazon S3. By using this construct, you can set up a disaster recovery configuration that complies with data protection regulations.

## How to Use

To use the OpenSearch Restore from S3 Construct, follow the instructions below:

1. Instantiate the `OpenSearchRestoreFromS3` construct in your CDK stack, providing the necessary parameters:

```typescript
new OpenSearchRestoreFromS3(this, "OpenSearchRestoreFromS3", {
  targetDomain: cdk.aws_opensearchservice.Domain,
  name: String,
  secretName: String,
  s3BucketName: String,
  s3ObjectKey: String,
  snapshotRole: cdk.aws_iam.Role,
  vpc: cdk.aws_ec2.Vpc,
  stagingSubnets: {subnetType: cdk.aws_ec2.SubnetType},
  stagingInstanceRole: cdk.aws_iam.Role,
  allowInboundSSH: Boolean
});
```

2. Customize the following parameters according to your environment:

- `targetDomain`: The OpenSearch domain where the restored data will be placed.
- `name`: A descriptive name for the restore configuration.
- `secretName`: The name of the AWS Secrets Manager secret that contains the encryption key needed for decryption.
- `s3BucketName`: The name of the Amazon S3 bucket where the encrypted backup is stored.
- `s3ObjectKey`: The key of the encrypted backup object within the Amazon S3 bucket.
- `snapshotRole`: The IAM role that allows the staging instance to restore the backup to the OpenSearch domain.
- `vpc`: The VPC (Amazon Virtual Private Cloud) where the staging instance and OpenSearch domain are located.
- `stagingSubnets`: The subnets to be used for the staging instance. Specify the subnet type (e.g., `SubnetType.PUBLIC`).
- `stagingInstanceRole`: The IAM role that allows the staging instance to access the encrypted backup in Amazon S3.
- `allowInboundSSH`: A boolean value indicating whether inbound SSH access to the staging instance is allowed (port 22 open).

3. Ensure that the `stagingInstanceRole` has appropriate permissions to access the encrypted backup in the specified Amazon S3 bucket.

4. Deploy the CDK stack, and the OpenSearch domain will be restored from the encrypted backup stored in Amazon S3.

## Notes

- The OpenSearch Restore from S3 Construct assumes that you have an existing OpenSearch domain where the restored data will be placed.

## Examples

To see a practical example of using the OpenSearch Restore from S3 Construct, refer to the `examples` folder in this repository. The example CDK stack provides step-by-step instructions and a working configuration to help you get started.