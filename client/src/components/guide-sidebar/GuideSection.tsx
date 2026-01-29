interface GuideSectionProps {
  icon: string;
  title: string;
  children: React.ReactNode;
}

export function GuideSection({ icon, title, children }: GuideSectionProps) {
  return (
    <div className="mb-7">
      <div className="text-sm font-semibold text-[#2563eb] mb-4 flex items-center gap-1.5">
        <span>{icon}</span>
        <span>{title}</span>
      </div>
      {children}
    </div>
  );
}
