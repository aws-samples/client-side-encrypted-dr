import * as cdk from "aws-cdk-lib";
import * as path from "path";
import {
  GenericRestoreFromS3,
  GenericRestoreFromS3Props,
} from "../generic-restore-from-s3";
import { Construct } from "constructs";
import {
  SecurityGroup,
  InstanceType,
  Instance,
  InstanceClass,
  InstanceSize,
  AmazonLinuxImage,
  AmazonLinuxGeneration,
  AmazonLinuxCpuType,
  CloudFormationInit,
  InitConfig,
  InitPackage,
  InitFile,
  InitCommand,
} from "aws-cdk-lib/aws-ec2";
import { DatabaseInstance } from "aws-cdk-lib/aws-rds";
import {
  ManagedPolicy,
} from "aws-cdk-lib/aws-iam";

export interface MysqlRestoreFromS3Props extends GenericRestoreFromS3Props {
  targetDatabase: DatabaseInstance;
}

export class MysqlRestoreFromS3 extends GenericRestoreFromS3 {
  constructor(scope: Construct, id: string, props: MysqlRestoreFromS3Props) {
    super(scope, id, props);

    props.stagingInstanceRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName("CloudWatchAgentServerPolicy")
    );

    props.targetDatabase.secret?.grantRead(props.stagingInstanceRole);

    const stagingInstanceSecurityGroup = new SecurityGroup(this, "StagingInstanceSecurityGroup", {
      vpc: props.vpc,
      allowAllOutbound: true,
    });

    props.targetDatabase.connections.allowDefaultPortFrom(stagingInstanceSecurityGroup);

    const stagingInstance = new Instance(this, "Instance", {
      vpc: props.vpc,
      instanceType:
        props.stagingInstanceType ||
        InstanceType.of(InstanceClass.C6G, InstanceSize.MEDIUM),
      machineImage: new AmazonLinuxImage({
        generation: AmazonLinuxGeneration.AMAZON_LINUX_2,
        cpuType: AmazonLinuxCpuType.ARM_64,
      }),
      securityGroup: stagingInstanceSecurityGroup,
      vpcSubnets: props.stagingSubnets,
      role: props.stagingInstanceRole,
      init: CloudFormationInit.fromConfigSets({
        configSets: {
          // Applies the configs below in this order
          default: ["cloudwatch", "packages", "script"],
        },
        configs: {
          cloudwatch: new InitConfig([
            InitPackage.yum("amazon-cloudwatch-agent"),
            InitFile.fromAsset(
              "/tmp/cloudwatch-agent-config.json",
              path.resolve(
                __dirname,
                "./cloudwatch-agent-config.json"
              )
            ),
            InitCommand.shellCommand("mkdir /var/log/restore"),
            InitCommand.shellCommand(
              "/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -s -c file:/tmp/cloudwatch-agent-config.json"
            ),
            InitCommand.shellCommand(
              "/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a start"
            ),
          ]),
          packages: new InitConfig([
            // Install an Amazon Linux package using yum
            InitPackage.yum("jq"),
            InitPackage.yum("mariadb"),
          ]),
          script: new InitConfig([
            // Copy the script to the instance
            InitFile.fromAsset(
              "/opt/mysql-restore.sh",
              path.resolve(__dirname, "./mysql-restore.sh"),
              { mode: "000744" }
            ),
            // Write config file
            InitFile.fromString(
              "/opt/restore.config",
              "DB_SECRET_NAME=" +
                props.targetDatabase.secret!.secretName +
                "\n" +
                "CRYPTO_SECRET_NAME=" +
                props.secretName +
                "\n" +
                "BACKUP_S3_BUCKET=" +
                props.s3BucketName +
                "\n" +
                "BACKUP_S3_KEY=" +
                props.s3ObjectKey +
                "\n" +
                "REGION=" +
                cdk.Stack.of(this).region,
              { mode: "000744" }
            ),
            // Run the script in the background, redirect all output to a log file
            InitCommand.shellCommand(
              "nohup /opt/mysql-restore.sh > /var/log/restore/mysql-restore.log 2>&1 &"
            ),
          ]),
        },
      }),
      initOptions: {
        // Optional, which configsets to activate (['default'] by default)
        configSets: ["default"],

        // Optional, how long the installation is expected to take (5 minutes by default)
        timeout: cdk.Duration.minutes(30),
      },
    });
    stagingInstance.node.addDependency(props.targetDatabase);
  }
}