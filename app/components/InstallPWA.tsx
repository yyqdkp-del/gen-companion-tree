'use client';
import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIOS(ios);

    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setIsInstalled(true);
    setDeferredPrompt(null);
  };

  if (isInstalled) return null;

  return (
    <>
      <button
        onClick={handleInstall}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '20px',
          zIndex: 9999,
          background: '#1D9E75',
          color: 'white',
          border: 'none',
          borderRadius: '999px',
          padding: '12px 20px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 4px 16px rgba(29,158,117,0.4)',
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3v12M8 11l4 4 4-4"/><rect x="3" y="17" width="18" height="4" rx="2"/>
        </svg>
        添加到桌面
      </button>

      {showIOSGuide && (
        <div
          onClick={() => setShowIOSGuide(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            zIndex: 99999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            padding: '0 16px 32px',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white', borderRadius: '20px', padding: '28px 24px',
              maxWidth: '360px', width: '100%',
            }}
          >
            <h3 style={{ fontSize: '17px', fontWeight: '700', marginBottom: '16px', color: '#111' }}>
              📲 添加到 iPhone 主屏幕
            </h3>
            {[
              ['1', '点击底部分享按钮', '□↑'],
              ['2', '向下滑动找到「添加到主屏幕」', '＋'],
              ['3', '点击右上角「添加」', '✓'],
            ].map(([step, text, icon]) => (
              <div key={step} style={{ display: 'flex', gap: '12px', marginBottom: '14px', alignItems: 'center' }}>
                <div style={{ width: '32px', height: '32px', background: '#1D9E75', borderRadius: '50%', color: 'white', fontWeight: '700', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{step}</div>
                <span style={{ fontSize: '15px', color: '#333', flex: 1 }}>{text}</span>
                <span style={{ fontSize: '20px', color: '#1D9E75' }}>{icon}</span>
              </div>
            ))}
            <button
              onClick={() => setShowIOSGuide(false)}
              style={{ width: '100%', background: '#1D9E75', color: 'white', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '16px', fontWeight: '600', marginTop: '8px', cursor: 'pointer' }}
            >
              知道了
            </button>
          </div>
        </div>
      )}
    </>
  );
}
