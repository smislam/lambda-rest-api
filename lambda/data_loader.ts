import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { GetObjectCommand, GetObjectRequest, S3Client } from "@aws-sdk/client-s3";
import { BatchWriteCommand, BatchWriteCommandInput, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { Context, SQSEvent, SQSHandler, SQSRecord } from "aws-lambda";
import { Readable } from "stream";

const clientS3 = new S3Client({region: process.env.REGION});
const clientDynamo = new DynamoDBClient({region: process.env.REGION});
const clientDoc = DynamoDBDocumentClient.from(clientDynamo);

export const handler: SQSHandler = async (event: SQSEvent, context: Context) => {
    try {
        const records: SQSRecord[] = event.Records;
        for (const record of records) {
            const sqsElements = JSON.parse(record.body);

            for (const element of sqsElements.Records) {
                const input: GetObjectRequest = {
                    Bucket: element.s3.bucket.name,
                    Key: element.s3.object.key,
                }

                const response = await clientS3.send(new GetObjectCommand(input));

                try {
                    if (response.Body instanceof Readable) {
                        const items = await getData(response.Body);
                        await writeToDb(JSON.parse(items));
                    } else {
                        console.error('File is not readable', JSON.stringify(input));                        
                    }
                } catch (error) {
                    console.error('File parsing error: ', JSON.stringify(input), error);
                    throw error;
                }
            }
        }

    } catch (error) {
        console.error(error);
        throw error;
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
            console.error('Error Loding data to Table: ', error);
            throw error;
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