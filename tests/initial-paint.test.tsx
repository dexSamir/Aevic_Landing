import { afterEach, expect, it, vi } from 'vitest';
import { afterInitialPaint } from '../src/app/afterInitialPaint';

afterEach(() => vi.unstubAllGlobals());

it('starts on the actual content-paint notification when Paint Timing is available', () => {
 let callback!: (list: {getEntries:()=>{name:string}[]}) => void;
 const observe=vi.fn(),disconnect=vi.fn();
 vi.stubGlobal('PerformanceObserver',class {
  static supportedEntryTypes=['paint'];
  constructor(onPaint: typeof callback){callback=onPaint;}
  observe=observe;disconnect=disconnect;
 });
 vi.stubGlobal('cancelAnimationFrame',vi.fn());
 const documentStub=new EventTarget() as EventTarget & {visibilityState:string};
 documentStub.visibilityState='visible';vi.stubGlobal('document',documentStub);
 const start=vi.fn();afterInitialPaint(start);
 expect(observe).toHaveBeenCalledWith({type:'paint',buffered:true});
 callback({getEntries:()=>[{name:'first-paint'}]});expect(start).not.toHaveBeenCalled();
 callback({getEntries:()=>[{name:'first-contentful-paint'}]});expect(start).toHaveBeenCalledTimes(1);
 expect(disconnect).toHaveBeenCalledTimes(1);
});

it('yields a paint opportunity and starts once without waiting for data or fonts', () => {
 const frames: FrameRequestCallback[]=[];
 vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => frames.push(callback));
 vi.stubGlobal('cancelAnimationFrame', vi.fn());
 const documentStub=new EventTarget() as EventTarget & {visibilityState:string};
 documentStub.visibilityState='visible';vi.stubGlobal('document',documentStub);
 const start=vi.fn();afterInitialPaint(start);
 expect(start).not.toHaveBeenCalled();frames.shift()!(0);
 expect(start).not.toHaveBeenCalled();frames.shift()!(16);
 expect(start).toHaveBeenCalledTimes(1);
 documentStub.visibilityState='hidden';documentStub.dispatchEvent(new Event('visibilitychange'));
 expect(start).toHaveBeenCalledTimes(1);
});

it('does not strand startup when a tab becomes hidden before the next frame', () => {
 vi.stubGlobal('requestAnimationFrame',vi.fn(()=>1));vi.stubGlobal('cancelAnimationFrame',vi.fn());
 const documentStub=new EventTarget() as EventTarget & {visibilityState:string};
 documentStub.visibilityState='visible';vi.stubGlobal('document',documentStub);
 const start=vi.fn();afterInitialPaint(start);
 documentStub.visibilityState='hidden';documentStub.dispatchEvent(new Event('visibilitychange'));
 expect(start).toHaveBeenCalledTimes(1);
 const hiddenStart=vi.fn();afterInitialPaint(hiddenStart);expect(hiddenStart).toHaveBeenCalledTimes(1);
});
