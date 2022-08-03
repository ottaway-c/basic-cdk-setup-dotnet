import * as cdk from "aws-cdk-lib";
import * as constructs from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import * as logs from "aws-cdk-lib/aws-logs";
import * as cr from "aws-cdk-lib/custom-resources";

export interface BasicCdkSetupStackProps extends cdk.StackProps {
  clusterName: string;
  databaseName: string;
  databaseUsername: string;
  databaseInstances: number;
}

export class BasicCdkSetupStack extends cdk.Stack {
  constructor(scope: constructs.Construct, id: string, props: BasicCdkSetupStackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, "Vpc", {
      natGateways: 0,
      maxAzs: 2,
      cidr: "10.0.0.0/16",
      subnetConfiguration: [
        {
          cidrMask: 20,
          name: "private",
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    vpc.addInterfaceEndpoint("SecretsManagerInterfaceEndpoint", {
      service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
    });

    const secret = new rds.DatabaseSecret(this, "DatabaseSecret", {
      username: props.databaseUsername,
      secretName: `${this.stackName}-database-secret`,
    });

    const scaling = {
      MinCapacity: 0.5,
      MaxCapacity: 16,
    };

    const databaseCluster = new rds.DatabaseCluster(this, "DatabaseCluster", {
      engine: rds.DatabaseClusterEngine.auroraMysql({
        version: rds.AuroraMysqlEngineVersion.VER_3_02_0,
      }),
      instances: props.databaseInstances,
      clusterIdentifier: props.clusterName,
      defaultDatabaseName: props.databaseName,
      instanceProps: {
        vpc: vpc,
        vpcSubnets: {
          onePerAz: true,
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
        instanceType: "serverless" as unknown as ec2.InstanceType,
        autoMinorVersionUpgrade: true,
        allowMajorVersionUpgrade: false,
        publiclyAccessible: false,
      },
      monitoringInterval: cdk.Duration.minutes(1),
      cloudwatchLogsExports: ["error", "general", "slowquery", "audit"],
      cloudwatchLogsRetention: logs.RetentionDays.INFINITE,
      credentials: rds.Credentials.fromSecret(secret),
      backup: {
        retention: cdk.Duration.days(30),
        preferredWindow: "01:00-02:00",
      },
      preferredMaintenanceWindow: "Tue:00:15-Tue:00:45",
    });

    databaseCluster.connections.allowFromAnyIpv4(ec2.Port.tcp(databaseCluster.clusterEndpoint.port));

    const dbScalingConfigure = new cr.AwsCustomResource(this, "DbScalingConfigure", {
      onCreate: {
        service: "RDS",
        action: "modifyDBCluster",
        parameters: {
          DBClusterIdentifier: databaseCluster.clusterIdentifier,
          ServerlessV2ScalingConfiguration: scaling,
        },
        physicalResourceId: cr.PhysicalResourceId.of(databaseCluster.clusterIdentifier),
      },
      onUpdate: {
        service: "RDS",
        action: "modifyDBCluster",
        parameters: {
          DBClusterIdentifier: databaseCluster.clusterIdentifier,
          ServerlessV2ScalingConfiguration: scaling,
        },
        physicalResourceId: cr.PhysicalResourceId.of(databaseCluster.clusterIdentifier),
      },
      policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
        resources: cr.AwsCustomResourcePolicy.ANY_RESOURCE,
      }),
    });

    const cfnDbCluster = databaseCluster.node.defaultChild as rds.CfnDBCluster;
    const dbScalingConfigureTarget = dbScalingConfigure.node.findChild("Resource").node.defaultChild as cdk.CfnResource;

    cfnDbCluster.addPropertyOverride("EngineMode", "provisioned");
    dbScalingConfigure.node.addDependency(cfnDbCluster);

    for (let i = 1; i <= props.databaseInstances; i++) {
      (databaseCluster.node.findChild(`Instance${i}`) as rds.CfnDBInstance).addDependsOn(dbScalingConfigureTarget);
    }

    const helloWorldFunction = new lambda.Function(this, "HelloWorldFunction", {
      code: lambda.Code.fromAsset("./src/BasicCdkSetup.HelloWorldLambda/bin/Release/net6.0"),
      handler: "BasicCdkSetup.HelloWorldLambda::BasicCdkSetup.HelloWorldLambda.Function::FunctionHandler",
      runtime: lambda.Runtime.DOTNET_6,
      architecture: lambda.Architecture.ARM_64,
      functionName: `${this.stackName}-hello-world`,
      timeout: cdk.Duration.seconds(10),
      memorySize: 512,
      environment: {
        POWERTOOLS_SERVICE_NAME: "BasicCdkSetup.HelloWorld",
        POWERTOOLS_LOG_LEVEL: "Information",
        DATABASE_SECRET_NAME: secret.secretName,
      },
      vpc: vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
    });

    secret.grantRead(helloWorldFunction);
  }
}
