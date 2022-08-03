## Prereqs

- Install VS Code for working in CDK in Typescript
- Install Node.js 16 LTS https://nodejs.org/en/
- Install cdk cli tool globally https://docs.aws.amazon.com/cdk/v2/guide/getting_started.html
- Install AWS cli tool https://aws.amazon.com/cli/ and setup default credentials using `aws configure`.
- Get familar with https://github.com/aws/aws-lambda-dotnet

## Install

Install CDK cli

```
npm install -g aws-cdk
```

Install cdk packages

```
npm i
```

Create a `.env` file and add the following variables:

```
CDK_DEFAULT_ACCOUNT=<AWS ACCOUNT ID>
CDK_DEFAULT_REGION=<AWS REGION>
STACK_NAME=basic-cdk-setup-dev
CLUSTER_NAME=basiccdksetupdevcluster
DATABASE_NAME=basiccdksetupdevdatabase
DATABASE_USERNAME=basiccdksetupdev
DATABASE_INSTANCES=2
```

Create an instance profile called `basic-cdk-setup-dev`

```
aws configure --profile basic-cdk-setup-dev
```

## Deploy

First we need to build out dotnet code in release mode

```
npm run package
```

Now we should be ok to deploy

```
npm run deploy
```
