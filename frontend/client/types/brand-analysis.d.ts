import 'react';

declare module 'react' {
  interface HTMLAttributes<T> extends AriaAttributes, DOMAttributes<T> {
    // Add any custom HTML attributes here if needed
  }
}

declare module 'lucide-react' {
  import { ComponentType, SVGProps } from 'react';
  
  export const Brain: ComponentType<SVGProps<SVGSVGElement>>;
  export const Sparkles: ComponentType<SVGProps<SVGSVGElement>>;
  export const BarChart3: ComponentType<SVGProps<SVGSVGElement>>;
  export const MessageSquare: ComponentType<SVGProps<SVGSVGElement>>;
  export const X: ComponentType<SVGProps<SVGSVGElement>>;
  export const Plus: ComponentType<SVGProps<SVGSVGElement>>;
  export const RefreshCw: ComponentType<SVGProps<SVGSVGElement>>;
  export const AlertCircle: ComponentType<SVGProps<SVGSVGElement>>;
  export const CheckCircle: ComponentType<SVGProps<SVGSVGElement>>;
  export const Globe: ComponentType<SVGProps<SVGSVGElement>>;
  export const FileText: ComponentType<SVGProps<SVGSVGElement>>;
  export const Users: ComponentType<SVGProps<SVGSVGElement>>;
  export const Target: ComponentType<SVGProps<SVGSVGElement>>;
  export const Activity: ComponentType<SVGProps<SVGSVGElement>>;
  export const Search: ComponentType<SVGProps<SVGSVGElement>>;
  export const Map: ComponentType<SVGProps<SVGSVGElement>>;
  
  // Re-export Map as MapIcon
  export const MapIcon: ComponentType<SVGProps<SVGSVGElement>>;
}

declare module '@/lib/utils' {
  export function cn(...classes: (string | undefined | null | false)[]): string;
}
