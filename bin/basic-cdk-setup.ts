#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { BasicCdkSetupStack } from "../lib/basic-cdk-setup-stack";

const app = new cdk.App();

new BasicCdkSetupStack(app, "basic-cdk-setup-dev", {});
