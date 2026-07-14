import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

const BUCKET = process.env.R2_BUCKET_NAME!
const PUBLIC_URL = process.env.R2_PUBLIC_URL!

export async function uploadToR2(
  key: string,
  file: File
): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const body = new Uint8Array(arrayBuffer)

  await r2.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: file.type,
    })
  )

  return `${PUBLIC_URL}/${key}`
}

export async function deleteFromR2(key: string): Promise<void> {
  await r2.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })
  )
}

export async function getPresignedUrl(key: string, expiresIn = 3600): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
  })
  return getSignedUrl(r2, command, { expiresIn })
}

export function getR2KeyFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url)
    const path = urlObj.pathname
    return path.startsWith("/") ? path.slice(1) : path
  } catch {
    return null
  }
}
