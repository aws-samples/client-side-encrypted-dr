import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Vpc, SubnetType, SecurityGroup, Port } from "aws-cdk-lib/aws-ec2";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import { Role, ServicePrincipal, PolicyStatement, Effect } from "aws-cdk-lib/aws-iam";
import { Domain, EngineVersion } from "aws-cdk-lib/aws-opensearchservice";
import { Bucket } from "aws-cdk-lib/aws-s3";
import { OpenSearchRestoreFromS3 } from "../../../constructs/opensearch-restore-from-s3";

export class OpensearchExampleStackStack extends cdk.Stack {
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
      assumedBy: new ServicePrincipal("ec2.amazonaws.com")
    });
    stagingInstanceRole.applyRemovalPolicy(cdk.RemovalPolicy.RETAIN); // RETAIN the role in case SSM attached some policies to it

    // Allow the staging instance role to access the encryption secret
    demoEncryptionSecret.grantRead(stagingInstanceRole);

    // Service Linked Role for OpenSearch
    const serviceLinkedRole = new cdk.CfnResource(this, "es-service-linked-role", {
      type: "AWS::IAM::ServiceLinkedRole",
      properties: {
        AWSServiceName: "es.amazonaws.com",
        Description: "Role for ES to access resources in the VPC"
      }
    });

    // Create a new OpenSearch Domain in the VPC
    const osSecurityGroup = new SecurityGroup(this, "OpenSearchSecurityGroup", {vpc});
    const domain = new Domain(this, 'Domain', {
      version: EngineVersion.OPENSEARCH_2_5,
      vpc,
      vpcSubnets: [vpc.selectSubnets({ subnets: [vpc.isolatedSubnets[0]] })],
      securityGroups: [osSecurityGroup],
      accessPolicies: [
        new PolicyStatement({
          actions: ['es:*'],
          effect: Effect.ALLOW,
          principals: [stagingInstanceRole],
          resources: ['*'],
        }),
      ],
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });
    domain.grantReadWrite(stagingInstanceRole);
    domain.node.addDependency(serviceLinkedRole);
    

    // Role used by the OpenSearch Domain to restore the snapshot from S3
    const snapshotRole = new Role(this, 'SnapshotRole', {
      assumedBy: new ServicePrincipal("es.amazonaws.com")
    });

    // Add PassRole permissions for the snapshot role to the staging instance role
    stagingInstanceRole.addToPrincipalPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["iam:PassRole"],
        resources: [snapshotRole.roleArn],
      })
    );

    // Temporary bucket for the snapshot restore process
    // This can be the bucket you use to store backups on AWS
    const bucket = new Bucket(this, 'SnapshotRestoreBucket', {})
    bucket.grantReadWrite(snapshotRole);
    bucket.grantReadWrite(stagingInstanceRole);
    const asset = new BucketDeployment(this, 'DemoOSIndexAsset', {
      sources: [Source.asset(path.join(__dirname, '../resources'))],
      destinationBucket: bucket
    });

    // Create the OpenSearch Restore from S3 construct
    const restore = new OpenSearchRestoreFromS3(this, "OpenSearchRestoreFromS3", {
      targetDomain: domain,
      name: "OpenSearchRestore",
      secretName: demoEncryptionSecret.secretName,
      s3BucketName: bucket.bucketName,
      s3ObjectKey: "opensearch-demo-index.tgz.gpg",
      snapshotRole: snapshotRole,
      vpc,
      stagingSubnets: {subnetType: SubnetType.PUBLIC},
      stagingInstanceRole: stagingInstanceRole,
      allowInboundSSH: true
    });

    // Allow the staging instance to connect to the OpenSearch Domain on Port 443
    osSecurityGroup.addIngressRule(restore.stagingInstanceSecurityGroup,  Port.tcp(443))    

  }
}
