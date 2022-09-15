import * as AWS from 'aws-sdk';

export const getSecretsValuesFromAwsSecretManager = async () => {
  const secretsManager = new AWS.SecretsManager({
    region: process.env.AWS_REGION || 'ap-northeast-1',
  });
  const response = await secretsManager
    .getSecretValue({
      SecretId: process.env.RDS_SECRET_NAME || 'NestAppStack-rds-credentials',
    })
    .promise();

  const { username, password, engine, host, port, dbname } = JSON.parse(
    response.SecretString ?? '',
  );

  return { username, password, engine, host, port, dbname };
};
