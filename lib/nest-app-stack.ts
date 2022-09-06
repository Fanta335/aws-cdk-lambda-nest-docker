import { Stack, StackProps, Duration, aws_lambda as lambda, aws_apigateway as apigw } from "aws-cdk-lib";
import { Construct } from "constructs";

export class NestAppStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);
    // Docker image
    const nestAppFunction = new lambda.DockerImageFunction(this, "nest-app", {
      code: lambda.DockerImageCode.fromImageAsset("src", {
        cmd: ["dist/main.handler"]
      }),
    });

    // Lambda
    const appLambda = new lambda.Function(this, `NestApplambda`, {
      runtime: lambda.Runtime.NODEJS_16_X,
      code: lambda.Code.fromAsset("src/dist"),
      handler: "main.handler",
      // layers: [lambdaLayer],
      environment: {
        NODE_PATH: "$NODE_PATH:/opt",
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
      },
      timeout: Duration.seconds(30),
    });
    // API Gateway
    const restApi = new apigw.RestApi(this, `NestAppApiGateway`, {
      restApiName: `NestAppApiGw`,
      deployOptions: {
        stageName: "v1",
      },
      // CORS設定
      defaultCorsPreflightOptions: {
        // warn: 要件に合わせ適切なパラメータに絞る
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: apigw.Cors.ALL_METHODS,
        allowHeaders: apigw.Cors.DEFAULT_HEADERS,
        statusCode: 200,
      },
    });

    restApi.root.addProxy({
      defaultIntegration: new apigw.LambdaIntegration(nestAppFunction),
      anyMethod: true,
    });
  }
}
