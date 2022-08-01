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

## Deploy

First we need to build out dotnet code in release mode

```
dotnet build .src/ -c release
```

Now we should be ok to deploy

```
cdk deploy
```
