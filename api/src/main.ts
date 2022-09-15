import serverlessExpress from '@vendia/serverless-express';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import { AppModule } from './app.module';
import {
  APIGatewayProxyEvent,
  Context,
  APIGatewayProxyResult,
} from 'aws-lambda';
import { config, SecretsManager } from 'aws-sdk';
import { ConfigService } from '@nestjs/config';

let serverlessExpressInstance;

const bootstrapServer = async (event: any, context: any) => {
  const expressApp = express();
  const nestApp = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
  );
  nestApp.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '"*"');
    res.header('Access-Control-Allow-Headers', '"*"');
    res.header(
      'Access-Control-Allow-Methods',
      'DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT',
    );
    next();
  });

  // const configService = nestApp.get(ConfigService);
  // const getSecretsValuesFromAwsSecretManager = async () => {
  //   const secretsManager = new SecretsManager({
  //     region: process.env.AWS_REGION,
  //   });
  //   const response = await secretsManager
  //     .getSecretValue({
  //       SecretId: configService.get('IAM_SECRET_NAME'),
  //     })
  //     .promise();

  //   const { accessKey, secretAccessKey } = JSON.parse(
  //     response.SecretString ?? '',
  //   );

  //   return { accessKey, secretAccessKey };
  // };
  // const { accessKey, secretAccessKey } =
  //   await getSecretsValuesFromAwsSecretManager();
  // config.update({
  //   credentials: {
  //     accessKeyId: accessKey,
  //     secretAccessKey: secretAccessKey,
  //   },
  //   region: configService.get('AWS_REGION'),
  // });

  await nestApp.init();
  serverlessExpressInstance = serverlessExpress({ app: expressApp });
  return serverlessExpressInstance(event, context);
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  await app.listen(3000);
}

// bootstrap();

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context,
): Promise<APIGatewayProxyResult> => {
  if (serverlessExpressInstance) {
    return serverlessExpressInstance(event, context);
  }
  return bootstrapServer(event, context);
};
