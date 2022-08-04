#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { BasicCdkSetupStack } from "../lib/basic-cdk-setup-stack";
import { get } from "env-var";
import * as dotenv from "dotenv";
dotenv.config();

const CDK_DEFAULT_ACCOUNT = get("CDK_DEFAULT_ACCOUNT").required().asString();
const CDK_DEFAULT_REGION = get("CDK_DEFAULT_REGION").required().asString();
const STACK_NAME = get("STACK_NAME").required().asString();

const VPC_ID = get("VPC_ID").required().asString();
const API_GATEWAY_VPC_ENDPOINT_ID = get("API_GATEWAY_VPC_ENDPOINT_ID").required().asString();

const CLUSTER_NAME = get("CLUSTER_NAME").required().asString();
const DATABASE_NAME = get("DATABASE_NAME").required().asString();
const DATABASE_USERNAME = get("DATABASE_USERNAME").required().asString();
const DATABASE_INSTANCES = get("DATABASE_INSTANCES").required().asInt();

const app = new cdk.App();

new BasicCdkSetupStack(app, STACK_NAME, {
  vpcId: VPC_ID,
  apiGatewayVpcEndpointId: API_GATEWAY_VPC_ENDPOINT_ID,
  clusterName: CLUSTER_NAME,
  databaseName: DATABASE_NAME,
  databaseUsername: DATABASE_USERNAME,
  databaseInstances: DATABASE_INSTANCES,
  env: {
    account: CDK_DEFAULT_ACCOUNT,
    region: CDK_DEFAULT_REGION,
  },
});
