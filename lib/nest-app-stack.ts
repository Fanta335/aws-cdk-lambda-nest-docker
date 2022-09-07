import { Stack, StackProps, Duration, aws_lambda as lambda, aws_apigateway as apigw } from "aws-cdk-lib";
import { Construct } from "constructs";

export class NestAppStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);
    // Docker image function
    const nestAppFunction = new lambda.DockerImageFunction(this, "nestAppFunction", {
      code: lambda.DockerImageCode.fromImageAsset("api", {
        cmd: ["dist/main.handler"],
        entrypoint: ["/lambda-entrypoint.sh"],
      }),
      environment: {
        NODE_OPTIONS: "--enable-source-maps",
      },
    });

    // API Gateway
    const restApi = new apigw.RestApi(this, `NestAppApiGateway`, {
      restApiName: `NestAppApiGateway`,
      // CORS設定
      defaultCorsPreflightOptions: {
        // warn: 要件に合わせ適切なパラメータに絞る
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: apigw.Cors.ALL_METHODS,
        allowHeaders: apigw.Cors.DEFAULT_HEADERS,
      },
    });

    restApi.root.addProxy({
      defaultIntegration: new apigw.LambdaIntegration(nestAppFunction),
    });
  }
}
