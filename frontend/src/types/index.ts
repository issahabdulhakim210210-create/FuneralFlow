export type Role = 'SUPER_ADMIN' | 'ORGANIZER' | 'FAMILY_MEMBER';
export type AccountStatus = 'PENDING_PAYMENT' | 'ACTIVE' | 'SUSPENDED' | 'DELETED';
export interface User { id:string; role:Role; fullName:string; email?:string; phone?:string; status:AccountStatus; organizerIdentifier?:string; subscriptionStatus?:string; subscriptionEndsAt?:string | null; }
export interface Service { id:string; name:string; description:string; price:number; images:string[]; rating?:number; alternatives?:Service[]; }
export interface FuneralSession { id:string; sessionCode:string; deceasedFullName:string; status:'PENDING'|'PLANNING'|'ACTIVE'|'COMPLETED'|'ARCHIVED'; progress:number; }
export interface Payment { id:string; amount:number; currency:string; status:string; provider:string; reference:string; createdAt:string; }
