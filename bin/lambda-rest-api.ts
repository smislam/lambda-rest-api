#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { LambdaRestApiStack } from '../lib/lambda-rest-api-stack';

const app = new cdk.App();
new LambdaRestApiStack(app, 'LambdaRestApiStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
});