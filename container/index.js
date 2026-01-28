import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import fs from "node:fs/promises";
import ffmpeg from "fluent-ffmpeg";
import path from "node:path";

const RESOLUTIONS = [
  { name: "360p", width: 480, height: 360 },
  { name: "480p", width: 858, height: 480 },
  { name: "720p", width: 1280, height: 720 },
  { name: "1080p", width: 1920, height: 1080 },
];

const client = new S3Client({
  region: "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
});

const BUCKET_NAME = process.env.BUCKET_NAME;
const KEY = process.env.KEY;

async function init() {
  try {
    const decodedKey = decodeURIComponent(KEY);

    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: decodedKey,
    });

    const result = await client.send(getCommand);

    const inputPath = path.resolve("input.mp4");
    const outputDir = path.resolve("output");

    await fs.mkdir(outputDir, { recursive: true });

    const body = await streamToBuffer(result.Body);
    await fs.writeFile(inputPath, body);

    //transcoding process
    await Promise.all(
      RESOLUTIONS.map((res) => {
        const outputPath = path.join(outputDir, `video-${res.name}.mp4`);

        return new Promise((resolve, reject) => {
          ffmpeg(inputPath)
            .output(outputPath)
            .withVideoCodec("libx264")
            .withAudioCodec("aac")
            .withSize(`${res.width}x${res.height}`)
            .format("mp4")
            .on("end", async () => {
              //upload back to S3 production bucket
              const putCommand = new PutObjectCommand({
                Bucket: "production.shahukor.xyz",
                Key: `output/video-${res.name}.mp4`,
                Body: await fs.readFile(outputPath),
              });

              await client.send(putCommand);
              console.log(`Uploaded ${res.name}`);
              resolve();
            })
            .on("error", reject)
            .run();
        });
      }),
    );

    console.log("All videos transcoded and uploaded");
  } catch (error) {
    console.error("Error processing video:", error);
  } finally {
    process.exit(0);
  }
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

init();
