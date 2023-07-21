import * as cdk from "aws-cdk-lib";
import { ISubnet, InstanceType, IVpc, Instance, InstanceClass, InstanceSize, AmazonLinuxImage, AmazonLinuxGeneration, SubnetSelection } from "aws-cdk-lib/aws-ec2";
import { Role } from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

export interface GenericRestoreFromS3Props {
  name: string;
  secretName: string;
  s3BucketName: string;
  s3ObjectKey: string;
  vpc: IVpc;
  stagingSubnets: SubnetSelection;
  stagingInstanceType?: InstanceType;
  stagingInstanceRole: Role;
  allowInboundSSH?: boolean;
}

export class GenericRestoreFromS3 extends Construct {
  stagingInstance: Instance;
  constructor(scope: Construct, id: string, props: GenericRestoreFromS3Props) {
    super(scope, id);
  }
}