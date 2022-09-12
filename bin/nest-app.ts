#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { NestAppStack } from "../lib/nest-app-stack";

const app = new cdk.App();
new NestAppStack(app, "NestAppStack", { projectName: "NestApp" });
