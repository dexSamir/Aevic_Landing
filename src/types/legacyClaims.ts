export interface LegacyClaim {id:string;sourceKey:string;status:'pending'|'approved'|'rejected'|'consumed'|'expired';createdAt:string}
export interface LegacyClaimReview extends LegacyClaim {userId:string;version:number;expiresAt?:string;teamName?:string;claimed:boolean;legacyContact?:{name?:string;email?:string;contact?:string};applicantEmail:string}
export interface LegacyHolding {teamId:string;sourceKey:string;name:string;status:'unclaimed'|'claimed';rosterNames:string[];mediaReferences:Array<{kind:'logo'|'player-photo';slot?:number;url:string}>;legacyStatus:string;tier?:string;createdAt:string;historyScope:string}
export interface LegacyRoster {teamId:string;rosterNames:string[];completed:boolean;historyIncomplete:boolean}
export interface LegacyRosterPlayer {ign:string;uid:string;role:'captain'|'starter'|'substitute'}
export interface LegacyClaimService {
 activate(email:string,password:string):Promise<void>;
 list():Promise<LegacyClaim[]>;
 request(sourceKey:string):Promise<void>;
 consume(id:string,code:string):Promise<{teamId:string}>;
 roster():Promise<LegacyRoster|null>;
 completeRoster(players:LegacyRosterPlayer[]):Promise<void>;
 holdings():Promise<LegacyHolding[]>;
 queue():Promise<LegacyClaimReview[]>;
 review(id:string,decision:'approve'|'reject',evidenceRef:string,expectedVersion:number):Promise<{code?:string;expiresAt?:string}>;
}
