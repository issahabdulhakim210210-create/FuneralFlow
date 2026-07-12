import { create } from 'zustand';
import { FuneralSession, Payment, Service } from '../types';
type AppState={ selectedRole?:'ORGANIZER'|'FAMILY_MEMBER'; services:Service[]; sessions:FuneralSession[]; payments:Payment[]; setSelectedRole:(r:any)=>void; setServices:(v:Service[])=>void; setSessions:(v:FuneralSession[])=>void; setPayments:(v:Payment[])=>void; };
export const useAppStore=create<AppState>((set)=>({ services:[], sessions:[], payments:[], setSelectedRole:(selectedRole)=>set({selectedRole}), setServices:(services)=>set({services}), setSessions:(sessions)=>set({sessions}), setPayments:(payments)=>set({payments}) }));
