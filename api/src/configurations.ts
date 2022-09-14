import * as AWS from 'aws-sdk';

export const getSecretsValuesFromAwsSecretManager = async () => {
  const secretsManager = new AWS.SecretsManager({
    region: 'ap-northeast-1',
  });
  const response = await secretsManager
    .getSecretValue({
      SecretId: process.env.RDS_SECRET_NAME,
    })
    .promise();

  const { username, password, engine, host, port, dbname } = JSON.parse(
    response.SecretString ?? '',
  );

  return { username, password, engine, host, port, dbname };
};
