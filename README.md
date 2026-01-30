# Segmenter - Event-Driven Video Transcoding Pipeline on AWS

This repository implements a **production-style, event-driven video transcoding system** using AWS managed services and Docker.

When a video is uploaded to Amazon S3, it is **automatically transcoded into multiple resolutions (360p, 480p, 720p, 1080p)** using FFmpeg running inside a Docker container on **AWS ECS (Fargate)**.

The system is fully **decoupled, scalable, and serverless**

---

## Architecture Overview

![Architecture-diagram](https://github.com/user-attachments/assets/20a4963c-5b27-46e1-a9ed-fccc0b8cfdc0)

---

## AWS Services Used

- **Amazon S3**
  - Stores original uploaded videos
  - Stores transcoded output videos

- **Amazon SQS**
  - Receives S3 event notifications
  - Decouples upload events from processing

- **Amazon ECS (Fargate)**
  - Runs video transcoding containers
  - Serverless container execution

- **Amazon ECR**
  - Stores Docker images for the transcoder

- **Docker**
  - Packages Node.js + FFmpeg environment

- **FFmpeg**
  - Performs actual video transcoding

---

## Project Structure

```
.
├── src/
│   └── index.ts        # Polls SQS and launches ECS tasks
│
├── container/
│   ├── Dockerfile
│   ├── index.js        # Downloads, transcodes, uploads video
│   └── package.json
│
└── README.md
```

---

## End-to-End Flow (Step-by-Step)

1. A user uploads a video to the S3 input bucket
2. S3 sends an event notification to SQS
3. The Node.js SQS worker polls the queue
4. The worker parses the S3 event payload
5. An ECS Fargate task is launched
6. ECS pulls the Docker image from ECR
7. The container:
   - Downloads the original video from S3
   - Transcodes it using FFmpeg
   - Uploads multiple resolutions back to S3
8. The SQS message is deleted after successful processing

---

## Transcoding Details

The video is transcoded into the following resolutions:

- **360p** – 480×360
- **480p** – 858×480
- **720p** – 1280×720
- **1080p** – 1920×1080

Each output file is uploaded to S3 under:

```
output/video-360p.mp4
output/video-480p.mp4
output/video-720p.mp4
output/video-1080p.mp4
```

---

## Why This Architecture?

- **Scalable** – Each upload triggers an independent ECS task
- **Fault-tolerant** – SQS guarantees message delivery
- **Cost-efficient** – Pay only when tasks run
- **Decoupled** – Uploads, processing, and storage are isolated
- **Production-grade** – Same pattern used by real video platforms

---

## Testing Results

- Successfully tested with a 4K (~90MB) video
- All output resolutions were generated correctly

---
