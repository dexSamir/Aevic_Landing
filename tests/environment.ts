import { builtinEnvironments, type Environment } from 'vitest/runtime';
// Keep fetch/Request and AbortSignal in the same Node realm (Node 22/24 enforce branding).
const environment: Environment = {
 ...builtinEnvironments.jsdom,
 name:'aevic-jsdom',
 async setup(global,options){
  const {AbortController,AbortSignal}=global;
  const context=await builtinEnvironments.jsdom.setup(global,options);
  Object.assign(global,{AbortController,AbortSignal});
  return context;
 },
};
export default environment;
