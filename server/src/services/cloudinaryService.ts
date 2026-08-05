import fs from 'fs';
import path from 'path';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env.js';

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

function getResourceType(filePath:string) {
  const ext = path.extname(filePath).toLowerCase();
  return ext === '.txt' ? 'raw' : 'auto';
}

export async function uploadSecure(filePath:string, folder:string){
  const fileName = path.basename(filePath);
  const publicId = fileName;
  const resourceType = getResourceType(filePath);

  const uploadOptions: any = {
    folder,
    public_id: publicId,
    resource_type: resourceType,
    overwrite: true,
    unique_filename: false,
  };

  if (resourceType === 'raw') {
    uploadOptions.content_type = 'text/plain';
  }

  const uploadResult = await cloudinary.uploader.upload(filePath, uploadOptions);

  await fs.promises.unlink(filePath).catch(() => null);

  return {
    public_id: uploadResult.public_id,
    secure_url: uploadResult.secure_url,
  };
}

export function signedUrl(publicId:string){
  const fileName = path.basename(publicId || '');
  return fileName ? `${env.APP_URL}/uploads/${encodeURIComponent(fileName)}` : '';
}
