# AWS Lambda based REST API
In this example, we create a Lambda based REST API.  We then expose the APIs using AWS Application Load Balancer.

This application takes advantage of `Serverless` and `Event-driven` architectures.  It allows automated loading of user data from S3 to AWS DynamoDB database.  It then makes the REST APIs available using a Lambda.  This solution also enables `Batch processing` of data loads and data retrievals to optimize performance.

This application is developed using AWS CDK in TypeScript.

## Architecture
![image](lambda-rest-api.jpg "Lambda REST API Architecture")

## What does it build?
* Creates a S3 bucket for user Data
* Creates a S3 event when new data file is available and invokes a data processing lambda
* Creates a Lambda that will process the S3 data and load to AWS DynamoDB.  Duplicated data will update existing records.
* Creates a DynamoDB table for data persistance
* Creates a Lambda that hostes multiple REST APIs: Single and Bulk
* Configures REST API to use JWT
* Creates an Application Load balancer (with SSL Certificate) to expose the Lambda which returns the REST API responses in JSON payload

## Steps to run and test
* Procure and add the appropriate certificate to AWS ACM, so that we can configure TLS.
* Store Certificate metadata to Secrets Manager so that we can use that for configuring the Application Load Balancer.
* Configure your Identity Provider.  We used Auth0.
* Once the Identity provider is created, add the infromation to SSM and Secrets Manager (Client-Secret), so that we can configure the REST API Lambda to validate JWT.
* Deploy the CDK code. Wait for the deployment to finish.  It will print out the API endpoint for you to use.  For demonstration purpose, we also share a data file that will be uploaded to S3.
* Update your IDP configurations callback configurations to use the API endpoints you have.
* Get the Access token from your Identity Provider
  * ![image](get-access-token.PNG "Example of fetching access token from Auth0")
* Invoke the REST APIs using the Access token
  * ![image](result.PNG "Example of a Single REST API Response")
  * ![image](batchResult.PNG "Example of a Batch REST API Response")

## Considerations
* We are using Self-signed Certificate.  Please use a Certificate Provider like Amazon Certificate Manager.
* AWS ALB doesn't support client_credentials. So, we protect the Lambda with JWT directly.
* Since we are using Auth0, we needed to open Lambda's Security Group outbound rules to connect to Auth0.  Identify the requirements for the IDP you are using.
* You can use Amazon Cognito instead of external IDP
* There are opportunities to simplify this solution

## References
* [Amazon DynamoDB](https://aws.amazon.com/pm/dynamodb/)
* [Amazon Lambda](https://aws.amazon.com/lambda/)
* [Amazon Elastic Load Balancer](https://aws.amazon.com/elasticloadbalancing/)
* [Amazon S3](https://aws.amazon.com/s3/)
* [Amazon Certificate Manager](https://aws.amazon.com/certificate-manager/)
* [Auth0](https://auth0.com)
