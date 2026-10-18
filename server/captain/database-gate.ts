/** Per-runtime admission, not a claim of shared capacity across Lambda instances. */
export function databaseGate(limit=1,maxQueued=64,waitMs=5000) {
 let active=0;
 const queue:Array<{grant:()=>void;timer:ReturnType<typeof setTimeout>}>=[];
 const failure=()=>Object.assign(new Error('Database acquisition unavailable'),{code:'POOL_QUEUE_FULL'});
 const release=()=>{const next=queue.shift();if(next){clearTimeout(next.timer);next.grant();}else active--;};
 return async function acquire():Promise<()=>void>{
  if(active<limit){active++;return release;}
  if(queue.length>=maxQueued)throw failure();
  return new Promise((resolve,reject)=>{
   const entry={grant:()=>resolve(release),timer:setTimeout(()=>{const index=queue.indexOf(entry);if(index>=0)queue.splice(index,1);reject(failure());},waitMs)};
   queue.push(entry);
  });
 };
}
