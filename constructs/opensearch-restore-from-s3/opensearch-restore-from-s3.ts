import * as cdk from "aws-cdk-lib";
import * as path from "path";
import {
  GenericRestoreFromS3,
  GenericRestoreFromS3Props,
} from "../generic-restore-from-s3";
import { Construct } from "constructs";
import {
  SecurityGroup,
  Port,
  Peer,
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
import { Domain } from "aws-cdk-lib/aws-opensearchservice";
import { Role } from "aws-cdk-lib/aws-iam";
import {
  ManagedPolicy,
} from "aws-cdk-lib/aws-iam";

export interface OpenSearchRestoreFromS3Props extends GenericRestoreFromS3Props {
  targetDomain: Domain;
  snapshotRole: Role;
}

export class OpenSearchRestoreFromS3 extends GenericRestoreFromS3 {
  stagingInstanceSecurityGroup: SecurityGroup;
  constructor(scope: Construct, id: string, props: OpenSearchRestoreFromS3Props) {
    super(scope, id, props);

    props.stagingInstanceRole.addManagedPolicy(
      ManagedPolicy.fromAwsManagedPolicyName("CloudWatchAgentServerPolicy")
    );

    this.stagingInstanceSecurityGroup = new SecurityGroup(this, "StagingInstanceSecurityGroup", {
      vpc: props.vpc,
      allowAllOutbound: true,
    });

    props.allowInboundSSH? this.stagingInstanceSecurityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(22)): null;

    const stagingInstance = new Instance(this, "Instance", {
      vpc: props.vpc,
      instanceType:
        props.stagingInstanceType ||
        InstanceType.of(InstanceClass.C6G, InstanceSize.MEDIUM),
      machineImage: new AmazonLinuxImage({
        generation: AmazonLinuxGeneration.AMAZON_LINUX_2,
        cpuType: AmazonLinuxCpuType.ARM_64,
      }),
      securityGroup: this.stagingInstanceSecurityGroup,
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
            // Install packages
            InitPackage.yum("jq"),
            InitCommand.shellCommand("pip3 install awscurl"),
            InitCommand.shellCommand('ln -s /usr/local/bin/awscurl /usr/bin/awscurl'),
            InitCommand.shellCommand("pip3 install urllib3==1.26.6") // downgrade urllib3 because urllib3 v2.0 only supports OpenSSL 1.1.1+
          ]),
          script: new InitConfig([
            // Copy the script to the instance
            InitFile.fromAsset(
              "/opt/opensearch-restore-from-s3.sh",
              path.resolve(__dirname, "./opensearch-restore-from-s3.sh"),
              { mode: "000744" }
            ),
            // Write config file
            InitFile.fromString(
              "/opt/restore.config",
              "DOMAIN_ENDPOINT=https://" +
                props.targetDomain.domainEndpoint  +
                "\n" +
                "SOURCE_BUCKET=" +
                props.s3BucketName +
                "\n" +
                "SOURCE_KEY=" +
                props.s3ObjectKey +
                "\n" +
                "SNAPSHOT_ROLE=" +
                props.snapshotRole.roleArn +
                "\n" +
                "CRYPTO_SECRET_NAME=" +
                props.secretName +
                "\n" +
                "REGION=" +
                cdk.Stack.of(this).region,
              { mode: "000744" }
            ),
            // Run the script in the background, redirect all output to a log file
            InitCommand.shellCommand(
              "nohup /opt/opensearch-restore-from-s3.sh > /var/log/restore/opensearch-restore-from-s3.log 2>&1 &"
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
    stagingInstance.node.addDependency(props.targetDomain);
  }
}