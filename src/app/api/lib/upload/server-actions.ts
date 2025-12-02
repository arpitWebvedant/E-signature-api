import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import slugify from '@sindresorhus/slugify';
import path from 'node:path';
import { getSignedUrl as getS3SignedUrl } from '@aws-sdk/s3-request-presigner';


export const uploadS3File = async (
  file: File,
  orgId: string,
  userId: string,
  folder: "original" | "signed" = "original"
) => {
  const client = getS3Client()

  const { name, ext } = path.parse(file.name)

  const key = `${process.env.NEXT_PRIVATE_UPLOAD_BUCKET}/${orgId}/${userId}/${folder}/${slugify(name)}${ext}`

  const fileBuffer = await file.arrayBuffer()

  const response = await client.send(
    new PutObjectCommand({
      Bucket: process.env.NEXT_PRIVATE_UPLOAD_BUCKET,
      Key: key,
      Body: Buffer.from(fileBuffer),
      ContentType: file.type,
    })
  )
  return { key, response }
}


const getS3Client = () => {
  const NEXT_PRIVATE_UPLOAD_TRANSPORT = process.env.NEXT_PRIVATE_UPLOAD_TRANSPORT;

  if (NEXT_PRIVATE_UPLOAD_TRANSPORT !== 's3') {
    throw new Error('Invalid upload transport');
  }

  const hasCredentials =
    process.env.NEXT_PRIVATE_UPLOAD_ACCESS_KEY_ID && process.env.NEXT_PRIVATE_UPLOAD_SECRET_ACCESS_KEY;

  return new S3Client({
    endpoint: process.env.NEXT_PRIVATE_UPLOAD_ENDPOINT || undefined,
    forcePathStyle: process.env.NEXT_PRIVATE_UPLOAD_FORCE_PATH_STYLE === 'true',
    region: process.env.NEXT_PRIVATE_UPLOAD_REGION || 'us-west-2',
    credentials: hasCredentials
      ? {
        accessKeyId: String(process.env.NEXT_PRIVATE_UPLOAD_ACCESS_KEY_ID),
        secretAccessKey: String(process.env.NEXT_PRIVATE_UPLOAD_SECRET_ACCESS_KEY),
      }
      : undefined,
  });
};

export const getPresignGetUrl = async (key: string) => {
  const client = getS3Client();

  const getObjectCommand = new GetObjectCommand({
    Bucket: process.env.NEXT_PRIVATE_UPLOAD_BUCKET,
    Key: key,
  });

  const ONE_SECOND = 1000;
  const ONE_MINUTE = ONE_SECOND * 60;
  const ONE_HOUR = ONE_MINUTE * 60;
  const url = await getS3SignedUrl(client, getObjectCommand, {
    expiresIn: ONE_HOUR / ONE_SECOND,
  });

  return { key, url };
};
