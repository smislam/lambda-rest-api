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
* Creates an Application Load balancer to expose the Lambda which returns the REST API responses in JSON payload

## Steps to run and test
* Deploy the CDK code. Wait for the deployment to finish.  It will print out the API endpoint for you to use.  For demonstration purpose, we also share a data file that will be uploaded to S3.
* Invoke the REST APIs
  * ![image](result.PNG "Example of a Single REST API Response")
  * ![image](batchResult.PNG "Example of a Batch REST API Response")

## References
* [Amazon DynamoDB](https://aws.amazon.com/pm/dynamodb/)
* [Amazon Lambda](https://aws.amazon.com/lambda/)
* [Amazon Elastic Load Balancer](https://aws.amazon.com/elasticloadbalancing/)
* [Amazon S3](https://aws.amazon.com/s3/)
