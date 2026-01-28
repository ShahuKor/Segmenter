import {
  ReceiveMessageCommand,
  SQSClient,
  DeleteMessageCommand,
} from "@aws-sdk/client-sqs";
import type { S3Event } from "aws-lambda";
import { ECSClient, RunTaskCommand } from "@aws-sdk/client-ecs";
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

const ecsClient = new ECSClient({
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
          if (event.Event === "s3:TestEvent") {
            await client.send(
              new DeleteMessageCommand({
                QueueUrl: queueURL,
                ReceiptHandle: message.ReceiptHandle,
              }),
            );
            continue;
          }
        }

        for (const record of event.Records) {
          const { eventName, s3 } = record;
          const {
            bucket,
            object: { key },
          } = s3;
          //spin the docker container
          const runTaskCommand = new RunTaskCommand({
            taskDefinition:
              "arn:aws:ecs:us-east-1:462634386376:task-definition/video-transcoder",
            cluster:
              "arn:aws:ecs:us-east-1:462634386376:cluster/decent-gecko-uc569v",
            launchType: "FARGATE",
            networkConfiguration: {
              awsvpcConfiguration: {
                assignPublicIp: "ENABLED",
                securityGroups: ["sg-058beb1fc246fc24e"],
                subnets: [
                  "subnet-0272148fbbad0d989",
                  "subnet-0577badfc281e52b2",
                  "subnet-0166b3054f852b64a",
                ],
              },
            },
            overrides: {
              containerOverrides: [
                {
                  name: "video-transcoder",
                  environment: [
                    { name: "BUCKET_NAME", value: bucket.name },
                    { name: "KEY", value: key },
                  ],
                },
              ],
            },
          });
          await ecsClient.send(runTaskCommand);
        }

        // delete message from the queue
        await client.send(
          new DeleteMessageCommand({
            QueueUrl: queueURL,
            ReceiptHandle: message.ReceiptHandle,
          }),
        );
      }
    } catch (error) {
      console.log(error);
    }
  }
}

init();
