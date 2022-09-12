import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getSecretsValuesFromAwsSecretManager } from './configurations';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: async () => {
        const { username, password, engine, host, port, dbname, cert } =
          await getSecretsValuesFromAwsSecretManager();
        return {
          type: engine,
          host: host,
          port: port,
          username: username,
          password: password,
          database: dbname,
          ssl: {
            cert: cert,
          },
          entities: [],
          synchronize: false,
        };
      },
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
