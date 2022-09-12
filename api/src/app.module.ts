import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getSecretsValuesFromAwsSecretManager } from './configurations';
import { CatsModule } from './cats/cats.module';
import { Cat } from './cats/cat.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: async () => {
        const { username, password, engine, host, port, dbname, cert } =
          await getSecretsValuesFromAwsSecretManager();
        return {
          type: engine,
          host: process.env.PROXY_ENDPOINT,
          port: port,
          username: username,
          password: password,
          database: dbname,
          entities: [Cat],
          synchronize: false,
          ssl: {
            cert: cert,
          },
        };
      },
    }),
    // TypeOrmModule.forRootAsync({
    //   useFactory: async () => {
    //     return {
    //       type: 'mysql',
    //       host: '127.0.0.1',
    //       port: 3306,
    //       username: 'root',
    //       password: '',
    //       database: 'test',
    //       entities: [Cat],
    //       synchronize: true,
    //     };
    //   },
    // }),
    CatsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
