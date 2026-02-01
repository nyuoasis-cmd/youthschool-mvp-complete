import { Menu } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

interface HeaderProps {
  onMenuClick: () => void;
  showMenuButton?: boolean;
}

export function Header({ onMenuClick, showMenuButton = true }: HeaderProps) {
  const [, navigate] = useLocation();

  return (
    <header className="sticky top-0 z-50 h-14 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-full items-center justify-between px-4">
        {showMenuButton ? (
          <button
            onClick={onMenuClick}
            className="p-2 hover:bg-accent rounded-md transition-colors"
            aria-label="메뉴 열기"
          >
            <Menu className="h-5 w-5" />
          </button>
        ) : (
          <div className="w-9" aria-hidden />
        )}

        <Logo />

        <Button
          onClick={() => navigate("/login")}
          size="sm"
          variant="default"
        >
          로그인
        </Button>
      </div>
    </header>
  );
}
