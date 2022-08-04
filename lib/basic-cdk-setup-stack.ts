import * as cdk from "aws-cdk-lib";
import * as constructs from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as rds from "aws-cdk-lib/aws-rds";
import * as logs from "aws-cdk-lib/aws-logs";
import * as cr from "aws-cdk-lib/custom-resources";
import * as apigateway from "aws-cdk-lib/aws-apigateway";

export interface BasicCdkSetupStackProps extends cdk.StackProps {
  vpcId: string;
  apiGatewayVpcEndpointId: string;
  clusterName: string;
  databaseName: string;
  databaseUsername: string;
  databaseInstances: number;
}

export class BasicCdkSetupStack extends cdk.Stack {
  constructor(scope: constructs.Construct, id: string, props: BasicCdkSetupStackProps) {
    super(scope, id, props);

    const vpc = ec2.Vpc.fromLookup(this, "Vpc", {
      vpcId: props.vpcId,
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

    const databaseProxy = databaseCluster.addProxy("DatabaseProxy", {
      vpc: vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      dbProxyName: this.stackName,
      secrets: [secret],
      iamAuth: false,
      requireTLS: false,
      borrowTimeout: cdk.Duration.seconds(30),
      maxConnectionsPercent: 100,
    });

    const helloWorldFunction = new lambda.Function(this, "HelloWorldFunction", {
      code: lambda.Code.fromAsset("./src/BasicCdkSetup.HelloWorldLambda/bin/Release/net6.0"),
      handler: "BasicCdkSetup.HelloWorldLambda::BasicCdkSetup.HelloWorldLambda.Function::FunctionHandler",
      functionName: `${this.stackName}-hello-world`,
      runtime: lambda.Runtime.DOTNET_6,
      architecture: lambda.Architecture.ARM_64,
      timeout: cdk.Duration.seconds(10),
      memorySize: 512,
      environment: {
        POWERTOOLS_SERVICE_NAME: "BasicCdkSetup.HelloWorld",
        POWERTOOLS_LOG_LEVEL: "Information",
        DATABASE_SECRET_NAME: secret.secretName,
        DATABASE_PROXY_ENDPOINT: databaseProxy.endpoint,
      },
      vpc: vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
    });

    databaseProxy.connections.allowFrom(helloWorldFunction, ec2.Port.tcp(3306));
    secret.grantRead(helloWorldFunction);

    const apiGatewayVpcEndpoint = ec2.InterfaceVpcEndpoint.fromInterfaceVpcEndpointAttributes(this, "VPC", {
      port: 443,
      vpcEndpointId: props.apiGatewayVpcEndpointId,
    });

    const api = new apigateway.RestApi(this, "api-gateway", {
      restApiName: "cdk-demo-api",
      endpointConfiguration: {
        types: [apigateway.EndpointType.PRIVATE],
        vpcEndpoints: [apiGatewayVpcEndpoint]
      },
      deployOptions: {
        stageName: "RD",
      },
    });

    api.root
      .addResource("hello")
      .addMethod("GET", new apigateway.LambdaIntegration(helloWorldFunction));
  }
}
