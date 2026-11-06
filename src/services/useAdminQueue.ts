import { useRef, useState } from 'react';
import { usePlatformQuery } from './queryCache';
import type { CursorPage } from '../types/domain';
/** Cache the first page; append only on explicit request. Filter changes cannot mix pages. */
export function useAdminQueue<T extends {id: string}>(key: string, fetchPage: (cursor?: string) => Promise<CursorPage<T>>) {
  const query = usePlatformQuery({key,query:()=>fetchPage()});
  const [extra,setExtra]=useState<{key:string;items:T[];nextCursor?:string;hasMore:boolean}>();
  const [loadingMore,setLoadingMore]=useState(false),[moreError,setMoreError]=useState('');
  const pending=useRef(false);
  const current=extra?.key===key?extra:undefined;
  const items=query.data?[...new Map([...query.data.items,...(current?.items??[])].map(item=>[item.id,item])).values()]:undefined;
  async function loadMore(){
    if(pending.current||!query.data)return;
    const cursor=current?current.nextCursor:query.data.nextCursor;
    if(!cursor)return;
    pending.current=true;setLoadingMore(true);setMoreError('');
    try{const page=await fetchPage(cursor);setExtra({key,items:[...(current?.items??[]),...page.items],nextCursor:page.nextCursor,hasMore:page.hasMore});}
    catch{setMoreError('Növbəti qeydlər yüklənmədi. Yenidən cəhd edin.');}
    finally{pending.current=false;setLoadingMore(false);}
  }
  return {...query,items,loadMore,loadingMore,moreError,hasMore:current?current.hasMore:Boolean(query.data?.hasMore)};
}
