import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Vpc, SubnetType } from "aws-cdk-lib/aws-ec2";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { Asset } from "aws-cdk-lib/aws-s3-assets";
import { Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import {
  DatabaseInstance,
  DatabaseInstanceEngine,
  Credentials,
  StorageType,
} from "aws-cdk-lib/aws-rds";
import { InstanceClass, InstanceSize, InstanceType } from "aws-cdk-lib/aws-ec2";
import { MysqlRestoreFromS3 } from "../../../constructs/mysql-restore-from-s3";


export class DatabaseExamplesStackStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    // VPC for the OpenSearch Domain and staging instance
    const vpc = new Vpc(this, "VPC", { natGateways: 0 });

    // Secrets Manager secret to store the encryption key used to encrypt ./resources/demo.sql.gpg
    // For demonstration purposes only. DO NOT USE THIS KEY FOR YOUR PROJECT UNDER ANY CIRCUMSTANCES
    // Define a process how the key is generated when creating the backups and how it is copied to secrets manager for recovery
    const demoEncryptionSecret = new Secret(this, 'DemoEncryptionSecret', {
      secretObjectValue: {
        EncryptionKey: cdk.SecretValue.unsafePlainText('3397b8e5854d41e8689dabc280166'),
      },
    });

    // Role for the staging instance
    const stagingInstanceRole = new Role(this, "InstanceRole", {
      assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
    });
    stagingInstanceRole.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN); // RETAIN the role in case SSM attached some policies to it

    // Allow the staging instance role to access the encryption secret
    demoEncryptionSecret.grantRead(stagingInstanceRole);

    // Asset to store the encrypted SQL dump from ./resources/demo.sql.gpg
    const asset = new Asset(this, 'DemoSQLDumpAsset', {
      path: path.join(__dirname, '../resources/demo.sql.gpg'),
      readers: [stagingInstanceRole],
    });

    // Create a new database instance in the VPC
    const dbInstance = new DatabaseInstance(this, "DemoDatabase", {
      engine: DatabaseInstanceEngine.MYSQL,
      instanceType:
        InstanceType.of(InstanceClass.R6G, InstanceSize.XLARGE),
      storageType: StorageType.GP2,
      allocatedStorage: 20,
      credentials: Credentials.fromGeneratedSecret("admin"),
      vpc,
      vpcSubnets: { subnetType: SubnetType.PRIVATE_ISOLATED },
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    // Create the MySQL restore from S3 construct
    const database1Restore = new MysqlRestoreFromS3(this, "MysqlRestore", {
      name: "MySqlTestDatabaseRestore",
      vpc: vpc,
      secretName: demoEncryptionSecret.secretName,
      s3BucketName: asset.s3BucketName,
      s3ObjectKey: asset.s3ObjectKey,
      stagingSubnets: {subnetType: SubnetType.PUBLIC},
      stagingInstanceRole: stagingInstanceRole,
      targetDatabase: dbInstance
    });
  }
}
