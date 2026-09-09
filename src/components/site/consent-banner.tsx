"use client";

import { useCallback, useEffect, useState } from "react";
import Script from "next/script";
import { useTranslations } from "next-intl";

/**
 * The PDPA consent banner and the analytics it gates. SPEC.md §10: "analytics
 * scripts load only after consent".
 *
 * The choice lives in `localStorage`, not a cookie — storing the record of a
 * cookie decision in a cookie is the joke every consent library tells, and
 * nothing here needs the value on the server.
 *
 * Nothing renders until the stored value has been read, so a returning visitor
 * who accepted never sees the banner flash, and a visitor who declined never
 * has the scripts injected for a frame.
 */
const STORAGE_KEY = "cida.consent.analytics";

type Decision = "granted" | "denied";

function readDecision(): Decision | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    // Private mode, or site data blocked. Treat it as "not yet decided", which
    // means no analytics — the safe direction.
    return null;
  }
}

export function ConsentBanner({ ga4Id, gtmId }: { ga4Id: string | null; gtmId: string | null }) {
  const t = useTranslations("consent");
  const [decision, setDecision] = useState<Decision | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setDecision(readDecision());
    setReady(true);
  }, []);

  const decide = useCallback((next: Decision) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // The decision still applies to this page view even if it cannot persist.
    }
    setDecision(next);
  }, []);

  const granted = decision === "granted";

  return (
    <>
      {ready && granted && ga4Id && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(ga4Id)}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('js',new Date());gtag('config',${JSON.stringify(ga4Id)},{anonymize_ip:true});
document.addEventListener('click',function(e){
  var a=e.target&&e.target.closest&&e.target.closest('a[href^="/go/line"]');
  if(!a)return;
  gtag('event','line_click',{link_url:a.getAttribute('href')});
});`}
          </Script>
        </>
      )}

      {ready && granted && gtmId && (
        <Script id="gtm-init" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer',${JSON.stringify(gtmId)});`}
        </Script>
      )}

      {ready && decision === null && (
        <div
          role="region"
          aria-label={t("label")}
          className="fixed inset-x-0 bottom-0 z-50 border-t border-(--color-border) bg-(--color-bg) px-4 py-4 md:px-6"
        >
          <div className="mx-auto flex max-w-(--container-site) flex-wrap items-center gap-4">
            <div className="min-w-64 flex-1">
              <p className="font-medium text-(--color-heading)">{t("title")}</p>
              <p className="mt-1 text-sm text-(--color-text)">{t("body")}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {/* Equal weight: a decline styled as an afterthought is not a choice. */}
              <button
                type="button"
                onClick={() => decide("denied")}
                className="rounded-(--radius-control) border border-(--color-border) px-5 py-2.5 text-sm text-(--color-text) hover:border-(--color-brand)"
              >
                {t("reject")}
              </button>
              <button
                type="button"
                onClick={() => decide("granted")}
                className="rounded-(--radius-control) bg-(--color-brand) px-5 py-2.5 text-sm font-medium text-white hover:bg-(--color-brand-hover)"
              >
                {t("accept")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
