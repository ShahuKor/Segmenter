import { ReceiveMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import type { S3Event } from "aws-lambda";

import dotenv from "dotenv";

dotenv.config();

const accessKeyId = process.env.AWS_ACCESS_KEY;
const secretAccessKey = process.env.AWS_SECRET_KEY;

const queueURL = process.env.AWS_QUEUE_URL;

if (!accessKeyId || !secretAccessKey) {
  throw new Error("Missing AWS Credentials");
}

const client = new SQSClient({
  region: "us-east-1",
  credentials: {
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey,
  },
});

async function init() {
  const command = new ReceiveMessageCommand({
    QueueUrl: queueURL,
    MaxNumberOfMessages: 1,
    WaitTimeSeconds: 20,
  });

  while (true) {
    const { Messages } = await client.send(command);
    if (!Messages) {
      console.log("No message in queue");
      continue;
    }
    try {
      for (const message of Messages) {
        const { MessageId, Body } = message;

        console.log("Message received : ", { MessageId, Body });
        if (!Body) {
          continue;
        }
        //validate and parse the event
        const event = JSON.parse(Body) as S3Event;

        //ignores the test event by S3
        if ("Service" in event && "Event" in event) {
          if (event.Event === "s3:TestEvent") continue;
        }

        for (const record of event.Records) {
          const { eventName, s3 } = record;
          const {
            bucket,
            object: { key },
          } = s3;
          //spin the docker container
        }

        // delete the message from the queue
      }
    } catch (error) {
      console.log(error);
    }
  }
}

init();
