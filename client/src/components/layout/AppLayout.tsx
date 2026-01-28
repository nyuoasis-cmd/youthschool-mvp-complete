import { ReactNode, useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { MobileMenu } from "./MobileMenu";
import { useAuth } from "@/hooks/use-auth";

const BREAKPOINTS = {
  mobile: 768,
} as const;

type DeviceType = "mobile" | "desktop";

const getDeviceType = (width: number): DeviceType => {
  return width > BREAKPOINTS.mobile ? "desktop" : "mobile";
};

const getSidebarStorageKey = (deviceType: DeviceType) =>
  `youthschool_sidebar_preference_${deviceType}`;

const readSidebarPreference = (deviceType: DeviceType): "open" | "closed" | null => {
  if (typeof window === "undefined") return null;
  if (deviceType === "mobile") return null;
  const value = window.localStorage.getItem(getSidebarStorageKey(deviceType));
  return value === "open" || value === "closed" ? value : null;
};

const getDefaultSidebarState = (deviceType: DeviceType): "open" | "closed" =>
  deviceType === "desktop" ? "open" : "closed";

interface AppLayoutProps {
  children: ReactNode;
  showSidebar?: boolean;
}

export function AppLayout({ children, showSidebar = true }: AppLayoutProps) {
  const [location, setLocation] = useLocation();
  const { user, isLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    const initialType = getDeviceType(window.innerWidth);
    const preference = readSidebarPreference(initialType);
    return initialType === "mobile" && (preference ?? getDefaultSidebarState(initialType)) === "open";
  });
  const [deviceType, setDeviceType] = useState<DeviceType>(() => {
    if (typeof window === "undefined") return "desktop";
    return getDeviceType(window.innerWidth);
  });
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    const initialType = getDeviceType(window.innerWidth);
    const preference = readSidebarPreference(initialType);
    return (preference ?? getDefaultSidebarState(initialType)) === "open";
  });

  const publicPrefixes = useMemo(
    () => ["/login", "/signup", "/password", "/pending-approval", "/about", "/contact"],
    []
  );

  const isPublicRoute = (path: string) => {
    if (path === "/") return true;
    return publicPrefixes.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
  };

  const persistSidebarPreference = (type: DeviceType, isOpen: boolean) => {
    if (typeof window === "undefined") return;
    if (type === "mobile") return;
    window.localStorage.setItem(
      getSidebarStorageKey(type),
      isOpen ? "open" : "closed"
    );
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => {
      const nextType = getDeviceType(window.innerWidth);
      setDeviceType((prev) => {
        if (prev === nextType) return prev;
        const preference = readSidebarPreference(nextType) ?? getDefaultSidebarState(nextType);
        const isOpen = preference === "open";
        setSidebarOpen(nextType === "mobile" ? false : isOpen);
        setMobileMenuOpen(false);
        return nextType;
      });
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (isLoading || isPublicRoute(location)) return;
    if (!user) {
      setLocation("/login");
      return;
    }
    if (user.status !== "active") {
      setLocation("/pending-approval");
    }
  }, [isLoading, location, setLocation, user]);

  const handleMenuToggle = () => {
    if (!showSidebar) return;
    if (deviceType === "mobile") {
      setMobileMenuOpen(true);
      return;
    }
    setSidebarOpen((prev) => {
      const next = !prev;
      persistSidebarPreference(deviceType, next);
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onMenuClick={handleMenuToggle} showMenuButton={showSidebar} />

      <div className="flex">
        {showSidebar && deviceType !== "mobile" && sidebarOpen && (
          <aside className="hidden md:block w-60 border-r bg-muted/30 min-h-[calc(100vh-3.5rem)] sticky top-14">
            <Sidebar />
          </aside>
        )}

        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>

      {showSidebar && deviceType === "mobile" && (
        <MobileMenu
          isOpen={mobileMenuOpen}
          onClose={() => {
            setMobileMenuOpen(false);
            persistSidebarPreference("mobile", false);
          }}
        />
      )}
    </div>
  );
}
