interface LogoProps {
  size?: "default" | "large";
  className?: string;
}

export function Logo({ size = "default", className = "" }: LogoProps) {
  const iconSize = size === "default" ? "w-8 h-8" : "w-10 h-10";
  const textSize = size === "default" ? "text-lg" : "text-2xl";
  const bar1Size = size === "default"
    ? "w-3 h-7 left-1 top-0.5"
    : "w-4 h-9 left-1 top-0.5";
  const bar2Size = size === "default"
    ? "w-2.5 h-5.5 right-0.5 top-1.5"
    : "w-3 h-7 right-0.5 top-1.5";

  return (
    <a href="/" className={`flex items-center gap-2.5 hover:opacity-90 transition-opacity ${className}`}>
      {/* Logo Icon */}
      <div className={`${iconSize} relative`}>
        <div
          className={`absolute ${bar1Size} bg-[#1B2A4A] rounded-sm`}
          style={{ transform: "rotate(-8deg)" }}
        />
        <div
          className={`absolute ${bar2Size} bg-[#7EC8B5] rounded-sm`}
        />
      </div>
      {/* Logo Text */}
      <span className={`${textSize} font-extrabold text-[#1B2A4A] tracking-tight`}>
        teachermate
      </span>
    </a>
  );
}

export default Logo;
