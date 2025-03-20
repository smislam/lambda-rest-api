import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { GetObjectCommand, GetObjectRequest, S3Client } from "@aws-sdk/client-s3";
import { BatchWriteCommand, BatchWriteCommandInput, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { Context, Handler, S3Event } from "aws-lambda";
import { Readable } from "stream";

const clientS3 = new S3Client({region: process.env.REGION});
const clientDynamo = new DynamoDBClient({region: process.env.REGION});
const clientDoc = DynamoDBDocumentClient.from(clientDynamo);

export const handler: Handler = async (event: S3Event, context: Context) => {
    try {
        const input: GetObjectRequest = {
            Bucket: event.Records[0].s3.bucket.name,
            Key: event.Records[0].s3.object.key,
        }

        const response = await clientS3.send(new GetObjectCommand(input));

        if (response.Body instanceof Readable) {
            const items = await getData(response.Body);
            await writeToDb(JSON.parse(items));
        } else {
            console.error('File cannot be read');
        }

    } catch (error) {
        console.error(error);
    }

    interface Bulk {
        "PutRequest": {
            Item: any
        }
    }

    async function writeToDb(items: any) {
        const bulkRequests: Bulk[] = [];

        for (const item of items) {
            const tempBulk = {
                "PutRequest": {
                    "Item": item
                }
            }
            bulkRequests.push(tempBulk);
        }

        const batchInput: BatchWriteCommandInput = {
            RequestItems: {
                "books": bulkRequests
            }
        };

        try {
            await clientDoc.send(new BatchWriteCommand(batchInput));
        } catch (error) {
            console.error(`Error Loding data: ${error}`);
        }
    }
}; 

const getData = (stream: Readable): Promise<string> => {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        stream.on('data', (chunk) => chunks.push(chunk));        
        stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
        stream.on('error', reject);
    });
}