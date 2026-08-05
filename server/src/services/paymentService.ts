import axios from 'axios'; import { env } from '../config/env.js'; import { query } from '../config/db.js'; import { audit } from './auditService.js';
export async function initializePaystack(userId:string,email:string,amountPesewas:number,purpose:string,requestId?:string,organizerPaymentPhone?:string){
  const reference=`FMS-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  const appCallbackUrl = new URL('/api/payments/paystack/callback', env.APP_URL).toString();
  const callbackUrl = env.PAYSTACK_CALLBACK_URL || appCallbackUrl;
  const paystackPayload = {
    email,
    amount:amountPesewas,
    reference,
    callback_url:callbackUrl,
    metadata:{userId,purpose,requestId,organizerPaymentPhone}
  };
  
  try {
    const {data}=await axios.post('https://api.paystack.co/transaction/initialize', paystackPayload, {
      headers:{Authorization:`Bearer ${env.PAYSTACK_SECRET_KEY}`}
    });
    
    const metadata = { requestId, userId, purpose, organizerPaymentPhone, paystack: data };
    await query('insert into payments(user_id,amount,currency,provider,purpose,reference,status,metadata) values($1,$2,$3,$4,$5,$6,$7,$8)',[userId,amountPesewas/100,'GHS','PAYSTACK',purpose,reference,'PENDING',metadata]);
    await audit(userId,'PAYMENT_INITIALIZED','payments',null,{reference,purpose,provider:'PAYSTACK',requestId,organizerPaymentPhone});
    return {reference, authorizationUrl:data.data.authorization_url};
  } catch(error: any) {
    console.error('Paystack error:', error.response?.status, error.response?.data);
    throw error;
  }
}
export async function verifyPaystack(reference:string){ const {data}=await axios.get(`https://api.paystack.co/transaction/verify/${reference}`,{headers:{Authorization:`Bearer ${env.PAYSTACK_SECRET_KEY}`}}); const paid=data.data.status==='success'; await query('update payments set status=$1::payment_status, verified_at=case when $1::payment_status=$2::payment_status then now() else verified_at end, metadata=metadata||$3 where reference=$4',[paid?'PAID':'FAILED','PAID',{paystack:data},reference]); await audit(null,'PAYMENT_VERIFIED','payments',null,{reference,paid}); return paid; }
export async function initializeHubtel(userId:string,amount:number,purpose:string){ const reference=`HUB-${Date.now()}`; await query('insert into payments(user_id,amount,currency,provider,purpose,reference,status) values($1,$2,$3,$4,$5,$6,$7)',[userId,amount,'GHS','HUBTEL',purpose,reference,'PENDING']); return {reference, checkoutUrl:null, message:'Configure Hubtel credentials and checkout endpoint'}; }
