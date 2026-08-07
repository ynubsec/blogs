"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { Column, Flex } from "@once-ui-system/core";
import { Footer, Header, RouteGuard, Providers } from "@/components";
import { PageBackdrop } from "@/components/PageBackdrop";
import { SiteMetaBar } from "@/components/SiteMetaBar";
import { ConfigProvider, type SiteConfig } from "@/components/ConfigProvider";
type SiteChromeProps = {
  config: SiteConfig;
  children: React.ReactNode;
};

/** Public site shell — skipped on /admin/* for faster admin pages. */
export function SiteChrome({ config, children }: SiteChromeProps) {
  const pathname = usePathname() ?? "";
  const isAdmin = pathname.startsWith("/admin");

  if (isAdmin) {
    return <ConfigProvider config={config}>{children}</ConfigProvider>;
  }

  return (
    <ConfigProvider config={config}>
      <Providers>
        <Column
          background="page"
          fillWidth
          style={{ minHeight: "100vh" }}
          margin="0"
          padding="0"
          horizontal="center"
          suppressHydrationWarning
        >
          <PageBackdrop />
          <Flex fillWidth minHeight="16" s={{ hide: true }} />
          <Suspense fallback={null}>
            <SiteMetaBar />
          </Suspense>
          <Suspense fallback={null}>
            <Header />
          </Suspense>
          <Flex
            zIndex={0}
            fillWidth
            padding="l"
            horizontal="center"
            flex={1}
            className="site-content"
          >
            <Flex horizontal="center" fillWidth minHeight="0">
              <RouteGuard>{children}</RouteGuard>
            </Flex>
          </Flex>
          <Footer />
        </Column>
      </Providers>
    </ConfigProvider>
  );
}
