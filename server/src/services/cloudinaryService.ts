import { v2 as cloudinary } from 'cloudinary'; import { env } from '../config/env.js';
cloudinary.config({ cloud_name:env.CLOUDINARY_CLOUD_NAME, api_key:env.CLOUDINARY_API_KEY, api_secret:env.CLOUDINARY_API_SECRET, secure:true });
export async function uploadSecure(filePath:string, folder:string){ return cloudinary.uploader.upload(filePath,{folder,resource_type:'auto',type:'authenticated'}); }
export function signedUrl(publicId:string){ return cloudinary.url(publicId,{sign_url:true,type:'authenticated',secure:true,expires_at:Math.floor(Date.now()/1000)+300}); }
