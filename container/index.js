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

const accessKeyId = process.env.AWS_ACCESS_KEY;
const secretAccessKey = process.env.AWS_SECRET_KEY;
const client = new S3Client({
  region: "us-east-1",
  credentials: {
    accessKeyId: accessKeyId,
    secretAccessKey: secretAccessKey,
  },
});

const BUCKET_NAME = process.env.BUCKET_NAME;
const KEY = process.env.KEY;

async function init() {
  try {
    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: KEY,
    });

    const result = await client.send(getCommand);
    const originalFilePath = "videos/original-file.mp4";
    await fs.mkdir("videos", { recursive: true });
    const body = await streamToBuffer(result.Body);
    await fs.writeFile(originalFilePath, body);

    const originalVideoPath = path.resolve(originalFilePath);

    // Start transcoding for each resolution
    await Promise.all(
      RESOLUTIONS.map((res) => {
        const output = `transcoded/video-${res.name}.mp4`;
        return new Promise((resolve, reject) => {
          ffmpeg(originalVideoPath)
            .output(output)
            .withVideoCodec("libx264")
            .withAudioCodec("aac")
            .withSize(`${res.width}x${res.height}`)
            .on("end", async () => {
              // Upload the transcoded video back to S3
              const putCommand = new PutObjectCommand({
                Bucket: BUCKET_NAME,
                Key: output,
                Body: await fs.readFile(output),
              });
              await client.send(putCommand);
              console.log(`Uploaded ${output}`);
              resolve();
            })
            .on("error", reject)
            .format("mp4")
            .run();
        });
      }),
    );

    console.log("All videos transcoded and uploaded!");
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
