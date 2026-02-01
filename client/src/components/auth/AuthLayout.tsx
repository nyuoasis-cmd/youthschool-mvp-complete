
interface AuthLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <a href="/" className="flex items-center justify-center gap-2.5 hover:opacity-90 transition-opacity">
          {/* Logo Icon */}
          <div className="w-10 h-10 relative">
            <div
              className="absolute w-4 h-9 left-1 top-0.5 bg-[#1B2A4A] rounded-sm"
              style={{ transform: "rotate(-8deg)" }}
            />
            <div className="absolute w-3 h-6 right-0.5 top-1.5 bg-[#7EC8B5] rounded-sm" />
          </div>
          {/* Logo Text */}
          <span className="text-2xl font-extrabold text-[#1B2A4A] tracking-tight">
            teachermate
          </span>
        </a>
        {title && (
          <h2 className="mt-6 text-center text-2xl font-bold text-gray-900">
            {title}
          </h2>
        )}
        {subtitle && (
          <p className="mt-2 text-center text-sm text-gray-600">
            {subtitle}
          </p>
        )}
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm sm:rounded-lg sm:px-10 border border-gray-100">
          {children}
        </div>
      </div>
    </div>
  );
}

interface AuthCardProps {
  children: React.ReactNode;
  className?: string;
}

export function AuthCard({ children, className = "" }: AuthCardProps) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      {children}
    </div>
  );
}
