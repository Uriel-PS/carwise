import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const oldUrl = formData.get('oldUrl'); // To delete old photo if replacing

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Apenas imagens são permitidas.' }, { status: 400 });
    }

    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'O tamanho máximo da imagem é 5MB.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename
    const uniqueId = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    const extension = file.name.split('.').pop();
    const fileName = `veiculos/${uniqueId}.${extension}`;

    // Delete old file if provided
    if (oldUrl) {
      try {
        // Extract filename from URL
        const oldFileName = oldUrl.split('/').slice(3).join('/'); // Remove https://pub-domain.r2.dev/
        await s3Client.send(new DeleteObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: oldFileName,
        }));
      } catch (e) {
        console.error('Failed to delete old file:', e);
        // Continue even if delete fails
      }
    }

    // Upload to R2
    await s3Client.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: fileName,
      Body: buffer,
      ContentType: file.type,
    }));

    // Return the public URL
    const publicUrl = `${process.env.R2_PUBLIC_URL}/${fileName}`;

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Erro ao fazer upload da imagem.' }, { status: 500 });
  }
}
