import { cn } from "@/lib/utils";

interface FolderIconProps {
  color?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  projectCount?: number;
  isOpen?: boolean;
}

/**
 * Visual folder icon inspired by Windows Explorer style.
 * Renders an SVG folder with configurable color, size, and open/closed state.
 */
export function FolderIcon({ color = "#f59e0b", size = "md", className, projectCount, isOpen = false }: FolderIconProps) {
  const sizes = {
    sm: { width: 40, height: 34 },
    md: { width: 64, height: 52 },
    lg: { width: 80, height: 66 },
  };

  const { width, height } = sizes[size];

  // Compute lighter and darker shades from the base color
  const darkerColor = adjustBrightness(color, -25);
  const lighterColor = adjustBrightness(color, 30);
  const tabColor = adjustBrightness(color, -10);

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg
        width={width}
        height={height}
        viewBox="0 0 64 52"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-md"
      >
        {/* Back panel */}
        <rect x="2" y="10" width="60" height="40" rx="3" fill={darkerColor} />
        
        {/* Tab */}
        <path
          d="M2 8C2 6.34315 3.34315 5 5 5H22L26 10H2V8Z"
          fill={tabColor}
        />
        
        {/* Front panel */}
        {isOpen ? (
          <>
            {/* Open folder - front panel tilted */}
            <path
              d="M4 18C4 16.3431 5.34315 15 7 15H59C60.6569 15 62 16.3431 62 18V47C62 48.6569 60.6569 50 59 50H5C3.34315 50 2 48.6569 2 47V18Z"
              fill={color}
            />
            <path
              d="M4 18C4 16.3431 5.34315 15 7 15H59C60.6569 15 62 16.3431 62 18V20H4V18Z"
              fill={lighterColor}
              opacity="0.5"
            />
          </>
        ) : (
          <>
            {/* Closed folder - front panel */}
            <rect x="2" y="12" width="60" height="38" rx="3" fill={color} />
            {/* Highlight stripe */}
            <rect x="2" y="12" width="60" height="4" rx="2" fill={lighterColor} opacity="0.4" />
          </>
        )}

        {/* Subtle inner shadow for depth */}
        <rect x="4" y="14" width="56" height="1" rx="0.5" fill="white" opacity="0.15" />
      </svg>

      {/* Project count badge */}
      {projectCount !== undefined && projectCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-sm">
          {projectCount}
        </span>
      )}
    </div>
  );
}

/**
 * Adjusts the brightness of a hex color.
 * Positive amount = lighter, negative = darker.
 */
function adjustBrightness(hex: string, amount: number): string {
  // Handle shorthand hex
  let color = hex.replace("#", "");
  if (color.length === 3) {
    color = color.split("").map(c => c + c).join("");
  }
  
  const num = parseInt(color, 16);
  let r = Math.min(255, Math.max(0, ((num >> 16) & 0xFF) + amount));
  let g = Math.min(255, Math.max(0, ((num >> 8) & 0xFF) + amount));
  let b = Math.min(255, Math.max(0, (num & 0xFF) + amount));
  
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
