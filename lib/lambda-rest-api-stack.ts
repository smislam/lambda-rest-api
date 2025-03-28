import * as cdk from 'aws-cdk-lib';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { AttributeType, TableClass, TableV2 } from 'aws-cdk-lib/aws-dynamodb';
import { Peer, Port, Vpc } from 'aws-cdk-lib/aws-ec2';
import { ApplicationLoadBalancer, ApplicationProtocol, SslPolicy } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { LambdaTarget } from 'aws-cdk-lib/aws-elasticloadbalancingv2-targets';
import { Runtime, Tracing } from 'aws-cdk-lib/aws-lambda';
import { S3EventSourceV2 } from 'aws-cdk-lib/aws-lambda-event-sources';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Bucket, BucketEncryption, EventType } from 'aws-cdk-lib/aws-s3';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import path = require('path');

export class LambdaRestApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const tableName = "books";
    const tablePK = "isbn";

    const vpc = new Vpc(this, 'app-vpc', {});

    const bucket = new Bucket(this,'data-bucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      encryption: BucketEncryption.S3_MANAGED
    });

    const bucketEventSource = new S3EventSourceV2(bucket, { events: [EventType.OBJECT_CREATED]});

    const appPath = path.resolve(path.join(__dirname, '../data'));
    const deploy = new BucketDeployment(this, 'source-app', {
      destinationBucket: bucket,
      sources: [
        Source.asset(appPath)
      ],
      retainOnDelete: false
    });    

    const table = new TableV2(this, 'dynamoDB', {
      partitionKey: { name: tablePK, type: AttributeType.NUMBER },
      tableName,
      tableClass: TableClass.STANDARD,
      pointInTimeRecovery: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    const dataLoader = new NodejsFunction(this, 'data-loader', {
      vpc,
      handler: 'handler',
      runtime: Runtime.NODEJS_LATEST,
      entry: path.join(__dirname, '/../lambda/data_loader.ts'),   
      logRetention: RetentionDays.ONE_DAY,
      tracing: Tracing.ACTIVE
    });
    table.grantWriteData(dataLoader);
    bucket.grantRead(dataLoader);    
    dataLoader.addEventSource(bucketEventSource);
    const issuer = StringParameter.valueForTypedStringParameterV2(this, 'auth-issuer');
    const audience = StringParameter.valueForTypedStringParameterV2(this, 'auth-audience');
    const jwksUri = StringParameter.valueForTypedStringParameterV2(this, 'auth-jwksUri');
    
    const bookApiLambda = new NodejsFunction(this, 'book-api-lambda', {
      vpc,
      handler: 'handler',
      runtime: Runtime.NODEJS_LATEST,
      entry: path.join(__dirname, '/../lambda/book_api.ts'),
      environment: {
        TABLE_NAME: tableName,
        ISSUER: issuer,
        AUDIENCE: audience,
        JWKSURI: jwksUri
      },      
      logRetention: RetentionDays.ONE_DAY,
      tracing: Tracing.ACTIVE,
    });

    table.grantReadData(bookApiLambda);

    const alb = new ApplicationLoadBalancer(this, 'rest-api-alb', {
      vpc,
      internetFacing: true
    });

    const cert = Certificate.fromCertificateArn(this, 'albcert', StringParameter.valueForTypedStringParameterV2(this, 'cert-arn'));

    const listener = alb.addListener('rest-api-listener', {
      port: 443,
      protocol: ApplicationProtocol.HTTPS,
      certificates: [cert],
      sslPolicy: SslPolicy.FORWARD_SECRECY
    });

    listener.addTargets('rest-api-target', {
      targets: [
        new LambdaTarget(bookApiLambda)
      ],
      healthCheck: {
        enabled: true
      }
    });

    // Add outbound rule for Lambda so that it can connect to idp to validate token
    // Use these IPs instead: https://auth0.com/docs/secure/security-guidance/data-security/allowlist
    bookApiLambda.connections.allowTo(Peer.ipv4('0.0.0.0/0'), Port.tcp(443));

    new cdk.CfnOutput(this, 'alb-url', {
      value: alb.loadBalancerDnsName,
      exportName: 'stack-loadBalancerDnsName'
    });
  }
}
