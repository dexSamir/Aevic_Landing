import { Download, Share2, WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button, Modal } from '../common/primitives';
import { acceptPwaUpdate, hasPwaUpdate } from '../../app/registerPwa';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

function isStandalone() { return window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone); }

export function InstallAevic({ compact = false }: { compact?: boolean }) {
  // Match the build-time HTML first; device-only UI is resolved after hydration.
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent>(); const [installed, setInstalled] = useState(false); const [instructions, setInstructions] = useState(false);
  const [isIos, setIsIos] = useState(false);
  useEffect(() => {
    setInstalled(isStandalone());
    setIsIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    const ready = (event: Event) => { event.preventDefault(); setPromptEvent(event as BeforeInstallPromptEvent); };
    const complete = () => { setInstalled(true); setPromptEvent(undefined); };
    window.addEventListener('beforeinstallprompt', ready); window.addEventListener('appinstalled', complete);
    return () => { window.removeEventListener('beforeinstallprompt', ready); window.removeEventListener('appinstalled', complete); };
  }, []);
  if (installed || (!promptEvent && !isIos)) return null;
  const install = async () => { if (promptEvent) { await promptEvent.prompt(); const choice = await promptEvent.userChoice; if (choice.outcome === 'accepted') setInstalled(true); setPromptEvent(undefined); } else setInstructions(true); };
  return <><Button variant="ghost" className={compact ? 'install-aevic--compact' : ''} icon={<Download size={17} />} onClick={() => void install()}>Install AEVIC</Button><Modal open={instructions} title="AEVIC-i quraşdır" onClose={() => setInstructions(false)}><div className="ios-install-guide"><Share2 size={24} /><p>Safari paylaşım menyusunu açın və <strong>“Add to Home Screen”</strong> seçin.</p><small>Bu təlimat yalnız siz Install AEVIC seçdikdən sonra göstərilir.</small></div></Modal></>;
}

export function OfflineNotice() {
  const [online, setOnline] = useState(true);
  useEffect(() => { setOnline(navigator.onLine); const on = () => setOnline(true); const off = () => setOnline(false); window.addEventListener('online', on); window.addEventListener('offline', off); return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); }; }, []);
  if (online) return null;
  return <aside className="offline-notice" role="status"><WifiOff size={16} /><span><strong>BAĞLANTI YOXDUR</strong> · Canlı status yenilənmir. Hesab məlumatları oflayn saxlanmır.</span></aside>;
}

export function PwaUpdateNotice() {
  const [available, setAvailable] = useState(hasPwaUpdate);
  useEffect(() => { const update = () => setAvailable(hasPwaUpdate()); window.addEventListener('aevic:pwa-update', update); return () => window.removeEventListener('aevic:pwa-update', update); }, []);
  if (!available) return null;
  return <aside className="offline-notice" role="status"><span>Yeni versiya hazırdır. Yadda saxlanmamış dəyişiklikləri tamamlayın.</span><Button variant="ghost" onClick={acceptPwaUpdate}>İndi yenilə</Button><Button variant="ghost" onClick={() => setAvailable(false)}>Sonra</Button></aside>;
}
