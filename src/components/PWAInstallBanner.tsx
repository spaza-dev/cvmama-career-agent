import React, { useState } from "react";
import { usePWAInstall } from "../hooks/usePWAInstall";
import { Button, Surface, Text } from "@cloudflare/kumo";
import {
  DownloadSimpleIcon,
  XIcon,
  ExportIcon,
  PlusSquareIcon,
  CheckCircleIcon
} from "@phosphor-icons/react";

export function PWAInstallBanner() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // Hide if already running in standalone mode or dismissed
  if (isInstalled || dismissed) return null;

  // Show banner if native installable OR if on iOS device
  if (!isInstallable && !isIOS) return null;

  return (
    <>
      <div className="w-full mb-3 animate-in fade-in slide-in-from-top duration-300">
        <Surface className="rounded-2xl border border-kumo-line bg-kumo-base p-3.5 sm:p-4 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#4898AD]/10 border border-[#4898AD]/30 text-[#4898AD]">
              <DownloadSimpleIcon size={20} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <Text size="sm" bold className="text-kumo-default truncate">
                  Install CV Mama App
                </Text>
                <span className="inline-block px-1.5 py-0.2 text-[10px] font-semibold rounded bg-[#4898AD]/15 text-[#4898AD]">
                  PWA
                </span>
              </div>
              <p className="text-xs text-kumo-subtle mt-0.5 truncate">
                Add to your mobile home screen for instant 1-tap access and offline tools.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isInstallable ? (
              <Button
                variant="primary"
                size="sm"
                icon={<DownloadSimpleIcon size={15} />}
                onClick={install}
                className="min-h-[38px] active:scale-[0.98]"
              >
                Install App
              </Button>
            ) : isIOS ? (
              <Button
                variant="primary"
                size="sm"
                icon={<ExportIcon size={15} />}
                onClick={() => setShowIOSGuide(true)}
                className="min-h-[38px] active:scale-[0.98]"
              >
                Install on iPhone
              </Button>
            ) : null}

            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="rounded-xl p-1.5 text-kumo-subtle hover:bg-kumo-control hover:text-kumo-default transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center"
              aria-label="Dismiss install banner"
            >
              <XIcon size={16} />
            </button>
          </div>
        </Surface>
      </div>

      {/* Step-by-Step Guide Modal for iOS Safari */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <Surface className="w-full max-w-sm rounded-3xl border border-kumo-line bg-kumo-base p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-kumo-line pb-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#4898AD]/10 text-[#4898AD]">
                  <DownloadSimpleIcon size={18} />
                </div>
                <h3 className="text-base font-semibold text-kumo-default">
                  Install on iPhone / iPad
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="rounded-xl p-1 text-kumo-subtle hover:bg-kumo-control"
                aria-label="Close guide"
              >
                <XIcon size={18} />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-kumo-default">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-kumo-control/40 border border-kumo-line/60">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-kumo-base text-[#4898AD] font-semibold text-xs border border-kumo-line">
                  1
                </div>
                <div className="space-y-1">
                  <p className="font-semibold flex items-center gap-1">
                    Tap Share <ExportIcon size={14} className="text-[#4898AD] inline" />
                  </p>
                  <p className="text-kumo-subtle">
                    Tap the <strong>Share</strong> button in your Safari browser navigation bar at the bottom.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-kumo-control/40 border border-kumo-line/60">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-kumo-base text-[#4898AD] font-semibold text-xs border border-kumo-line">
                  2
                </div>
                <div className="space-y-1">
                  <p className="font-semibold flex items-center gap-1">
                    Add to Home Screen <PlusSquareIcon size={14} className="text-[#4898AD] inline" />
                  </p>
                  <p className="text-kumo-subtle">
                    Scroll down the options list and tap <strong>Add to Home Screen</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-kumo-control/40 border border-kumo-line/60">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-kumo-base text-[#4898AD] font-semibold text-xs border border-kumo-line">
                  3
                </div>
                <div className="space-y-1">
                  <p className="font-semibold flex items-center gap-1">
                    Launch CV Mama <CheckCircleIcon size={14} className="text-[#4898AD] inline" />
                  </p>
                  <p className="text-kumo-subtle">
                    The CV Mama app icon will appear on your iPhone home screen for fast 1-tap launch!
                  </p>
                </div>
              </div>
            </div>

            <Button
              variant="primary"
              className="w-full min-h-[44px]"
              onClick={() => setShowIOSGuide(false)}
            >
              Got It
            </Button>
          </Surface>
        </div>
      )}
    </>
  );
}
