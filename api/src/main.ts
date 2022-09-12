import serverlessExpress from '@vendia/serverless-express';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import { AppModule } from './app.module';
import { APIGatewayProxyEvent } from 'aws-lambda';
import * as mysql from 'mysql2/promise';
import * as AWS from 'aws-sdk';

const cert = `-----BEGIN CERTIFICATE-----
MIIDQTCCAimgAwIBAgITBmyfz5m/jAo54vB4ikPmljZbyjANBgkqhkiG9w0BAQsF
ADA5MQswCQYDVQQGEwJVUzEPMA0GA1UEChMGQW1hem9uMRkwFwYDVQQDExBBbWF6
b24gUm9vdCBDQSAxMB4XDTE1MDUyNjAwMDAwMFoXDTM4MDExNzAwMDAwMFowOTEL
MAkGA1UEBhMCVVMxDzANBgNVBAoTBkFtYXpvbjEZMBcGA1UEAxMQQW1hem9uIFJv
b3QgQ0EgMTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBALJ4gHHKeNXj
ca9HgFB0fW7Y14h29Jlo91ghYPl0hAEvrAIthtOgQ3pOsqTQNroBvo3bSMgHFzZM
9O6II8c+6zf1tRn4SWiw3te5djgdYZ6k/oI2peVKVuRF4fn9tBb6dNqcmzU5L/qw
IFAGbHrQgLKm+a/sRxmPUDgH3KKHOVj4utWp+UhnMJbulHheb4mjUcAwhmahRWa6
VOujw5H5SNz/0egwLX0tdHA114gk957EWW67c4cX8jJGKLhD+rcdqsq08p8kDi1L
93FcXmn/6pUCyziKrlA4b9v7LWIbxcceVOF34GfID5yHI9Y/QCB/IIDEgEw+OyQm
jgSubJrIqg0CAwEAAaNCMEAwDwYDVR0TAQH/BAUwAwEB/zAOBgNVHQ8BAf8EBAMC
AYYwHQYDVR0OBBYEFIQYzIU07LwMlJQuCFmcx7IQTgoIMA0GCSqGSIb3DQEBCwUA
A4IBAQCY8jdaQZChGsV2USggNiMOruYou6r4lK5IpDB/G/wkjUu0yKGX9rbxenDI
U5PMCCjjmCXPI6T53iHTfIUJrU6adTrCC2qJeHZERxhlbI1Bjjt/msv0tadQ1wUs
N+gDS63pYaACbvXy8MWy7Vu33PqUXHeeE6V/Uq2V8viTO96LXFvKWlJbYK8U90vv
o/ufQJVtMVT8QtPHRh8jrdkPSHCa2XV4cdFyQzR1bldZwgJcJmApzyMZFo6IQ6XU
5MsI+yMRQ+hDKXJioaldXgjUkK642M4UwtBV8ob2xJNDd2ZhwLnoQdeXeGADbkpy
rqXRfboQnoZsG4q5WTP468SQvvG5
-----END CERTIFICATE-----`.trim();

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

export const handler = async (event: APIGatewayProxyEvent) => {
  // if (serverlessExpressInstance) {
  //   return serverlessExpressInstance(event, context);
  // }
  // return bootstrapServer(event, context);

  const params = event.queryStringParameters ? event.queryStringParameters : {};

  const RESPONSE_HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization,access-token',
  };

  const secretsManager = new AWS.SecretsManager({
    region: 'ap-northeast-1',
  });
  const response = await secretsManager
    .getSecretValue({
      SecretId: 'NestAppStack-rds-credentials',
    })
    .promise();

  const { host, username, password } = JSON.parse(response.SecretString ?? '');

  const connection = await mysql.createConnection({
    host: process.env.PROXY_ENDPOINT,
    user: username,
    password,
    database: 'app',
    // ssl: {
    //   cert: fs.readFileSync(__dirname + '/cert/AmazonRootCA1.pem', 'utf-8')
    // },
    ssl: {
      cert: cert,
    },
  });

  const result = await connection.query('select * from user');

  return {
    statusCode: 200,
    headers: RESPONSE_HEADERS,
    body: JSON.stringify(result[0]),
  };
};
