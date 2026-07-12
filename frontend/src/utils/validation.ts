export const isEmail=(v:string)=>/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
export const isStrongPassword=(v:string)=>/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(v);
export const isPhone=(v:string,country='GH')=> country==='GH'?/^\+233[235]\d{8}$/.test(v):/^\+[1-9]\d{7,14}$/.test(v);
