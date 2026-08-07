"use client";

import { usePathname } from "next/navigation";
import { routes } from "@/resources";
import NotFound from "@/app/not-found";

interface RouteGuardProps {
  children: React.ReactNode;
}

function isRouteEnabled(pathname: string | null): boolean {
  if (!pathname) return false;

  if (pathname in routes) {
    return routes[pathname as keyof typeof routes];
  }

  for (const route of Object.keys(routes) as (keyof typeof routes)[]) {
    if (!routes[route] || route === "/") continue;
    if (pathname.startsWith(`${route}/`)) {
      return true;
    }
  }

  return false;
}

const RouteGuard: React.FC<RouteGuardProps> = ({ children }) => {
  const pathname = usePathname();
  const routeEnabled = isRouteEnabled(pathname);

  if (!routeEnabled) {
    return <NotFound />;
  }

  return <>{children}</>;
};

export { RouteGuard };
