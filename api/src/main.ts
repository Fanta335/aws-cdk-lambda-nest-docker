import serverlessExpress from '@vendia/serverless-express';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import { AppModule } from './app.module';
import {
  APIGatewayProxyEvent,
  Context,
  APIGatewayProxyResult,
  Handler,
} from 'aws-lambda';
import * as mysql from 'mysql2/promise';
import * as AWS from 'aws-sdk';

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
  await nestApp.init();
  serverlessExpressInstance = serverlessExpress({ app: expressApp });
  return serverlessExpressInstance(event, context);
};

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context,
): Promise<APIGatewayProxyResult> => {
  if (serverlessExpressInstance) {
    return serverlessExpressInstance(event, context);
  }
  return bootstrapServer(event, context);

  // const params = event.queryStringParameters ? event.queryStringParameters : {};

  // const RESPONSE_HEADERS = {
  //   'Content-Type': 'application/json',
  //   'Access-Control-Allow-Origin': '*',
  //   'Access-Control-Allow-Headers': 'Content-Type,Authorization,access-token',
  // };

  // const secretsManager = new AWS.SecretsManager({
  //   region: 'ap-northeast-1',
  // });
  // const response = await secretsManager
  //   .getSecretValue({
  //     SecretId: 'NestAppStack-rds-credentials',
  //   })
  //   .promise();

  // const { host, username, password } = JSON.parse(response.SecretString ?? '');

  // const connection = await mysql.createConnection({
  //   host: process.env.PROXY_ENDPOINT,
  //   user: username,
  //   password,
  //   database: 'app',
  //   // ssl: {
  //   //   cert: fs.readFileSync(__dirname + '/cert/AmazonRootCA1.pem', 'utf-8')
  //   // },
  //   ssl: {
  //     cert: cert,
  //   },
  // });

  // const result = await connection.query('select * from user');

  // return {
  //   statusCode: 200,
  //   headers: RESPONSE_HEADERS,
  //   body: JSON.stringify(result[0]),
  // };
};

// async function bootstrap() {
//   const app = await NestFactory.create(AppModule);
//   app.enableCors();

//   await app.listen(3000);
// }
// bootstrap();
