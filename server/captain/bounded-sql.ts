import {databaseGate} from './database-gate';
import type {Sql} from 'postgres';
import {AsyncLocalStorage} from 'node:async_hooks';

export const databaseMetrics=new AsyncLocalStorage<{queries:number;queryMs:number;timeouts:number;queueWaitMs:number}>();
const timeoutError=()=>Object.assign(new Error('Database query deadline exceeded'),{code:'QUERY_TIMEOUT'});

/** Keep lazy SQL fragments intact; bound only executed queries, including pool wait. */
export function boundedSql(sql:Sql,timeoutMs=8000,maxPending=64):Sql {
 const acquire=databaseGate(1,maxPending);
 const wrapQuery=(query:any,inTransaction:boolean):any=>{
  let result:Promise<unknown>|undefined;
  const run=()=>result??=(async()=>{

   const metrics=databaseMetrics.getStore(),started=performance.now();
   if(metrics)metrics.queries++;
   let timer:ReturnType<typeof setTimeout>|undefined;
   let release:()=>void;
   try{release=inTransaction?()=>{}:await acquire();}
   finally{if(metrics)metrics.queueWaitMs+=performance.now()-started;}
   const executionStarted=performance.now();
   try {
    return await Promise.race([Promise.resolve(query),new Promise((_,reject)=>{
     timer=setTimeout(()=>{
      if(metrics)metrics.timeouts++;
      // Driver cancels queued work before execution or sends PostgreSQL CancelRequest.
      // Never retry mutations after a deadline: their outcome can be ambiguous.
      Promise.resolve(query.cancel()).catch(()=>{});
      reject(timeoutError());
     },timeoutMs);
    })]);
   } finally {clearTimeout(timer);release();if(metrics)metrics.queryMs+=performance.now()-executionStarted;}
  })();
  return new Proxy(query,{get(target,key){
   if(key==='then')return (resolve:any,reject:any)=>run().then(resolve,reject);
   if(key==='catch')return (reject:any)=>run().catch(reject);
   if(key==='finally')return (done:any)=>run().finally(done);
   const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;
  }});
 };
 const wrap=(target:any,inTransaction=false):any=>new Proxy(target,{
  apply(fn,thisArg,args){const value=Reflect.apply(fn,thisArg,args);return Array.isArray(args[0]?.raw)?wrapQuery(value,inTransaction):value;},
  get(fn,key){
   if(key==='unsafe')return (...args:any[])=>wrapQuery(fn.unsafe(...args),inTransaction);
   if(key==='begin')return async(work:any)=>{
    const started=performance.now(),release=await acquire(),metrics=databaseMetrics.getStore();
    if(metrics)metrics.queueWaitMs+=performance.now()-started;
    try{return await fn.begin(async(tx:any)=>{
    // Startup GUCs can be ignored by Supavisor. SET LOCAL is transaction-safe.
    await tx`set local statement_timeout='8s'`;
    await tx`set local lock_timeout='3s'`;
    await tx`set local idle_in_transaction_session_timeout='10s'`;
    return work(wrap(tx,true));
    });}finally{release();}
   };
   return Reflect.get(fn,key,fn);
  }
 });
 return wrap(sql);
}
