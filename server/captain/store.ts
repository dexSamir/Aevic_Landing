export type CaptainRow = Record<string, unknown> & {id:string;email:string;password_hash:string;reset_token:string|null;team_name:string};
export type TeamPatch = Record<string, string | null>;
export interface CaptainStore {
 // Implementations must check the existing schema/security contract before private access.
 ready(): Promise<void>;
 byEmail(email:string):Promise<CaptainRow|undefined>;
 byId(id:string):Promise<CaptainRow|undefined>;
 issueReset(row:CaptainRow, value:string):Promise<boolean>;
 consumeReset(id:string,expected:string,hash:string,expires:number):Promise<boolean>;
 changeHash(id:string,expected:string,hash:string):Promise<boolean>;
 update(id:string,expectedHash:string,patch:TeamPatch):Promise<CaptainRow>;
 register(values:TeamPatch):Promise<CaptainRow>;
 publicMedia(id:string):Promise<{bucket:string;name:string}|undefined>;
}
