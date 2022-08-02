import { Duration, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";

export class BasicCdkSetupStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const helloWorldFunction = new lambda.Function(this, "HelloWorldFunction", {
      code: lambda.Code.fromAsset(
        "./src/BasicCdkSetup.HelloWorldLambda/bin/Release/net6.0"
      ),
      handler:
        "BasicCdkSetup.HelloWorldLambda::BasicCdkSetup.HelloWorldLambda.Function::FunctionHandler",
      runtime: lambda.Runtime.DOTNET_6,
      functionName: `${this.stackName}-hello-world`,
      timeout: Duration.seconds(10),
      memorySize: 512,
      environment: {
        POWERTOOLS_SERVICE_NAME: "BasicCdkSetup.HelloWorld",
        POWERTOOLS_LOG_LEVEL: "Information",
      },
    });
  }
}
