import { ZodSchema } from 'zod';
export const validate=(schema:ZodSchema)=>(req:any,res:any,next:any)=>{ const parsed=schema.safeParse({body:req.body,query:req.query,params:req.params}); if(!parsed.success) return res.status(422).json({message:'Validation failed',errors:parsed.error.flatten()}); Object.assign(req, parsed.data); next(); };
