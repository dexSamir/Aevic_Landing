import { createApp } from '../../server/app';
// Netlify Functions v2 supplies a Web Request and accepts a Web Response.
const app=createApp();
export default (request:Request)=>{
 const url=new URL(request.url);
 if(url.pathname.startsWith('/.netlify/functions/api/')) url.pathname='/api/'+url.pathname.slice('/.netlify/functions/api/'.length);
 return app.fetch(new Request(url,request));
};
