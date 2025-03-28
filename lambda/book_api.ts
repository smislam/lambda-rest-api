import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { BatchGetCommand, BatchGetCommandInput, DynamoDBDocumentClient, GetCommand, GetCommandInput } from "@aws-sdk/lib-dynamodb";
import { JwtVerifier } from "aws-jwt-verify";
import { Handler } from "aws-lambda";

const clientDynamo = new DynamoDBClient({region: process.env.REGION});
const clientDoc = DynamoDBDocumentClient.from(clientDynamo);

const missing = {
  statusCode: 404,
  body: JSON.stringify({ message: 'Missing criteria' }),
};
const notFound = {
  statusCode: 404,
  body: JSON.stringify({ message: 'Not Found' }),
};
const serverError = {
  statusCode: 500,
  body: JSON.stringify({ message: 'Kernel Panic!' }),
};

const jwtVerifier = JwtVerifier.create({
   issuer: process.env.ISSUER || '',
   jwksUri: process.env.JWKSURI,
   audience: process.env.AUDIENCE
});

export const handler: Handler = async (event, context) => {

  try {
    const authHeader = event.headers?.Authorization || event.headers?.authorization;

    if (!authHeader) {
      return errorMessage(401, 'Missing Authorization header');
    } 
   
    await jwtVerifier.verify(authHeader.split(' ')[1], {
      audience: process.env.AUDIENCE || ''
    });
  } catch {
    return errorMessage(401, 'Invalid token');
  }

  switch (`${event.httpMethod} ${event.path}`) {
    case 'POST /book':
      return getBook(JSON.parse(Buffer.from(event.body, 'base64').toString('utf-8')));
    case 'POST /books':
      return getBooks(JSON.parse(Buffer.from(event.body, 'base64').toString('utf-8')));
    default:
      return notFound;  
  }
};

const getBooks = async (payload: any) => { 
  if (payload && payload !== "") {
    const keyItems: any[] = [];  
    
    for (const item of payload) {
      keyItems.push(item);
    }
    
    const batchInput: BatchGetCommandInput = {
      RequestItems: {
        "books": {
          "Keys": keyItems
        }
      }
    }

    try {
      const data = await clientDoc.send(new BatchGetCommand(batchInput));
      const books: Book[] = data.Responses?.['books'] as Book[];
    
      return {
        statusCode: 200,
        body: JSON.stringify({ books }),
      };
    } catch (error) {
      console.error(`Error Fetching data: ${error}`);
      return serverError;
    }
  } else {
    return missing;
  }
};

const getBook = async (payload: any) => {  
  if (payload.isbn && payload.isbn !== "") {
    const input: GetCommandInput = {
      Key: {
        "isbn": Number(payload.isbn)
      },
      TableName: process.env.TABLE_NAME
    }    

    try {
      const response = await clientDoc.send(new GetCommand(input));

      const book: Book = response.Item as Book;

      return {
        statusCode: 200,
        body: JSON.stringify({ book }),
      };
    } catch (error) {
      console.error(`Error Fetching data: ${error}`);
      return serverError;
    } 
  } else {
    return missing;
  }
};

const errorMessage = (code: Number, message: string) => {
  return {
    statusCode: code,
    body: JSON.stringify({ message: message }),
  };
};
