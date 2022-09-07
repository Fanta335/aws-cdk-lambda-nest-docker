import serverlessExpress from '@vendia/serverless-express';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';
import { AppModule } from './app.module';

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

export const handler = (event: any, context: any) => {
  if (serverlessExpressInstance) {
    return serverlessExpressInstance(event, context);
  }
  return bootstrapServer(event, context);
};
