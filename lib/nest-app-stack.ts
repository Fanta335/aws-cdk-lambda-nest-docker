import {
  Stack,
  RemovalPolicy,
  StackProps,
  Duration,
  aws_rds as rds,
  aws_ec2 as ec2,
  aws_s3 as s3,
  aws_iam as iam,
  aws_secretsmanager as secrets,
  aws_lambda as lambda,
  aws_apigateway as apigw,
  SecretValue,
  CfnOutput,
} from "aws-cdk-lib";
import { Construct } from "constructs";

export interface CustomizedProps extends StackProps {
  projectName: string;
}

export class NestAppStack extends Stack {
  constructor(scope: Construct, id: string, props: CustomizedProps) {
    super(scope, id, props);

    const PROJECT_NAME = props.projectName;

    // VPCの作成
    const vpc = new ec2.Vpc(this, "VPC", {
      cidr: "10.0.0.0/16",
      vpcName: `${PROJECT_NAME}-vpc`,
      enableDnsHostnames: true,
      enableDnsSupport: true,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "Public",
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: "Private",
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
      maxAzs: 2,
    });

    const bastionGroup = new ec2.SecurityGroup(this, "Bastion to DB", { vpc });
    const lambdaToRDSProxyGroup = new ec2.SecurityGroup(this, "Lambda to RDSProxy", { vpc });
    const dbConnectionGroup = new ec2.SecurityGroup(this, "RDSProxy to DB", { vpc });

    dbConnectionGroup.addIngressRule(dbConnectionGroup, ec2.Port.tcp(3306), "allow db connection");

    dbConnectionGroup.addIngressRule(lambdaToRDSProxyGroup, ec2.Port.tcp(3306), "allow lambda connection");

    dbConnectionGroup.addIngressRule(bastionGroup, ec2.Port.tcp(3306), "allow bastion connection");

    // パブリックサブネットに踏み台サーバを配置する
    const host = new ec2.BastionHostLinux(this, "BastionHost", {
      vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO),
      securityGroup: bastionGroup,
      subnetSelection: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
    });
    host.instance.addUserData("yum -y update", "yum install -y mysql jq");

    // S3
    const s3Bucket = new s3.Bucket(this, "Bucket", {
      publicReadAccess: true,
    });

    // S3を操作するためのIAMユーザー
    const iamUserForS3 = new iam.User(this, "iamUserForS3", {
      userName: id + "-s3-admin",
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonS3FullAccess")],
    });
    const accessKey = new iam.CfnAccessKey(this, "accessKey", {
      userName: iamUserForS3.userName,
    });
    const secretAccessKey = accessKey.attrSecretAccessKey;

    // IAMユーザーの認証情報
    const iamUserForS3CredentialsSecret = new secrets.Secret(this, "iamUserForS3CredentialsSecret", {
      secretName: id + "-iam-user-for-s3-credentials",
      secretObjectValue: {
        username: SecretValue.unsafePlainText(iamUserForS3.userName),
        accessKey: SecretValue.unsafePlainText(accessKey.ref),
        secretAccessKey: SecretValue.unsafePlainText(secretAccessKey),
      },
    });

    // 確認用
    new CfnOutput(this, "access_key", { value: accessKey.ref });
    new CfnOutput(this, "secret_access_key", { value: secretAccessKey });

    // RDSの認証情報
    const databaseCredentialsSecret = new secrets.Secret(this, "DBCredentialsSecret", {
      secretName: id + "-rds-credentials",
      generateSecretString: {
        secretStringTemplate: JSON.stringify({
          username: "syscdk",
        }),
        excludePunctuation: true,
        includeSpace: false,
        generateStringKey: "password",
      },
    });

    // RDS
    const rdsInstance = new rds.DatabaseInstance(this, "DBInstance", {
      engine: rds.DatabaseInstanceEngine.mysql({
        version: rds.MysqlEngineVersion.VER_8_0_26,
      }),
      credentials: rds.Credentials.fromSecret(databaseCredentialsSecret),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MICRO),
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
      },
      // multiAz: true,
      securityGroups: [dbConnectionGroup],
      removalPolicy: RemovalPolicy.DESTROY,
      deletionProtection: false,
      parameterGroup: new rds.ParameterGroup(this, "ParameterGroup", {
        engine: rds.DatabaseInstanceEngine.mysql({
          version: rds.MysqlEngineVersion.VER_8_0_26,
        }),
        parameters: {
          character_set_client: "utf8mb4",
          character_set_server: "utf8mb4",
        },
      }),
    });

    // RDS proxyを追加
    const proxy = rdsInstance.addProxy(id + "-proxy", {
      secrets: [databaseCredentialsSecret],
      debugLogging: true,
      vpc,
      securityGroups: [dbConnectionGroup],
      requireTLS: false,
    });

    const iamRoleForLambda = new iam.Role(this, "iamRoleForLambda", {
      roleName: `${PROJECT_NAME}-lambda-role`,
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      // VPCに設置するためのポリシー定義
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AWSLambdaVPCAccessExecutionRole")],
    });

    // Lambda関数をDocker imageから作成
    const nestAppLambdaFunction = new lambda.DockerImageFunction(this, "nestAppFunction", {
      code: lambda.DockerImageCode.fromImageAsset("api", {
        cmd: ["dist/main.handler"],
        entrypoint: ["/lambda-entrypoint.sh"],
      }),
      role: iamRoleForLambda,
      vpc: vpc,
      allowPublicSubnet: true,
      timeout: Duration.seconds(30),
      securityGroups: [lambdaToRDSProxyGroup],
      environment: {
        NODE_OPTIONS: "--enable-source-maps",
        PROXY_ENDPOINT: proxy.endpoint,
        RDS_SECRET_NAME: id + "-rds-credentials",
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
      },
      memorySize: 128,
    });

    // Lambda関数がRDSとIAMの認証情報へアクセスすることを許可
    databaseCredentialsSecret.grantRead(nestAppLambdaFunction);
    iamUserForS3CredentialsSecret.grantRead(nestAppLambdaFunction);

    // Lambda関数からSecret ManagerにアクセスするためのVPCエンドポイント
    new ec2.InterfaceVpcEndpoint(this, "SecretManagerVpcEndpoint", {
      vpc: vpc,
      service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
    });

    // API Gateway
    const restApi = new apigw.RestApi(this, `NestAppApiGateway`, {
      restApiName: `NestAppApiGateway`,
      deployOptions: {
        stageName: "dev",
      },
      // CORS設定
      defaultCorsPreflightOptions: {
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: apigw.Cors.ALL_METHODS,
        allowHeaders: apigw.Cors.DEFAULT_HEADERS,
        statusCode: 200,
      },
    });

    restApi.root.addProxy({
      defaultIntegration: new apigw.LambdaIntegration(nestAppLambdaFunction),
      anyMethod: true,
    });
  }
}
