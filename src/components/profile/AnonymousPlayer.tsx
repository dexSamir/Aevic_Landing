import { useId } from 'react';

/** Decorative vector fallback; the roster's name and role provide its semantics. */
export function AnonymousPlayer() {
  const id = useId().replace(/:/g, '');
  return <svg className="anonymous-player" viewBox="0 0 320 440" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={`${id}-body`} x1="0" x2="1"><stop stopColor="currentColor" stopOpacity=".65" /><stop offset=".08" stopColor="#202022" /><stop offset=".42" stopColor="#090a0c" /><stop offset=".85" stopColor="#111215" /><stop offset="1" stopColor="currentColor" stopOpacity=".4" /></linearGradient>
      <radialGradient id={`${id}-head`} cx=".22" cy=".18" r=".85"><stop stopColor="currentColor" stopOpacity=".85" /><stop offset=".12" stopColor="#303031" /><stop offset=".42" stopColor="#111214" /><stop offset=".78" stopColor="#060709" /><stop offset="1" stopColor="#17181b" /></radialGradient>
      <linearGradient id={`${id}-rim`}><stop stopColor="currentColor" stopOpacity=".85" /><stop offset=".45" stopColor="currentColor" stopOpacity="0" /><stop offset="1" stopColor="currentColor" stopOpacity=".5" /></linearGradient>
    </defs>
    <path d="M-12 440 1 316Q5 285 47 272L112 247Q129 233 126 198L194 198Q191 233 208 247L273 272Q315 285 319 316L332 440Z" fill={`url(#${id}-body)`} stroke={`url(#${id}-rim)`} strokeWidth="2" />
    <path d="M112 246Q160 288 208 246M40 278 85 302 127 307M280 278 235 302 193 307M85 302 73 401M235 302 247 401" fill="none" stroke={`url(#${id}-rim)`} strokeWidth="1.5" opacity=".6" />
    <path d="M99 139Q94 58 159 54Q226 56 221 139Q232 131 226 161L217 182Q208 218 183 236Q160 249 137 236Q112 218 103 182L94 161Q88 132 99 139Z" fill={`url(#${id}-head)`} stroke={`url(#${id}-rim)`} strokeWidth="2" />
  </svg>;
}
