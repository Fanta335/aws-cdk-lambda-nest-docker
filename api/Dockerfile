FROM amazon/aws-lambda-nodejs:16
RUN npm i -g @nestjs/cli
WORKDIR /${LAMBDA_TASK_ROOT}
COPY package*.json .
RUN npm install
COPY . .
RUN npm run build
