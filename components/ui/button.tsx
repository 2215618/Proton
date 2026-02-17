import * as React from "react";

/**
 * cn local para evitar dependencias (lib/utils, clsx, etc.)
 */
function cn(...classes: Array<string | undefined | null | false>) {
  return classes.filter(Boolean).join(" ");
}

type ButtonVariant =
  | "default"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive"
  | "link";

type ButtonSize = "default" | "sm" | "lg" | "icon";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /**
   * asChild sin Radix Slot: clona un único child (ej: <a/>)
   * Esto evita instalar dependencias y no rompe builds.
   */
  asChild?: boolean;
}

/**
 * Aurora Premium Button:
 * - default: gradiente violeta tipo maqueta
 * - secondary/outline: glass button (aurora-btn-glass)
 * - focus ring elegante
 * - no cambia textos ni lógica: solo estilos
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "default",
      size = "default",
      asChild = false,
      children,
      type,
      ...props
    },
    ref
  ) => {
    const base =
      "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full " +
      "text-sm font-medium transition-all " +
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background-light " +
      "disabled:pointer-events-none disabled:opacity-50 " +
      "active:scale-[0.98]";

    const sizes: Record<ButtonSize, string> = {
      default: "h-10 px-4",
      sm: "h-9 px-3",
      lg: "h-11 px-5 text-[15px]",
      icon: "h-10 w-10",
    };

    const variants: Record<ButtonVariant, string> = {
      default:
        // Violeta premium (tipo Stitch Aurora)
        "bg-gradient-to-r from-primary to-primary-hover text-white " +
        "shadow-[0_12px_28px_rgba(96,10,255,0.22)] " +
        "hover:shadow-[0_18px_45px_rgba(96,10,255,0.26)]",
      secondary:
        // Glass pill
        "aurora-btn-glass text-text-main",
      outline:
        "aurora-btn-glass text-text-main border border-white/70",
      ghost:
        "bg-transparent hover:bg-white/50 text-text-main",
      destructive:
        "bg-accent-coral text-white shadow-[0_12px_28px_rgba(244,63,94,0.18)] hover:shadow-[0_18px_45px_rgba(244,63,94,0.22)]",
      link:
        "bg-transparent text-primary underline-offset-4 hover:underline",
    };

    const finalClassName = cn(base, sizes[size], variants[variant], className);

    /**
     * asChild: clona un único elemento hijo (ej. <a>), manteniendo el className.
     * Si no cumple (no es ReactElement), cae a <button>.
     */
    if (asChild && React.isValidElement(children)) {
      const child = children as React.ReactElement<any>;
      const merged = cn(child.props?.className, finalClassName);

      // Evitamos pasar "type" a anchors/divs
      const { type: _t, ...rest } = props as any;

      return React.cloneElement(child, {
        ...rest,
        className: merged,
      });
    }

    return (
      <button
        ref={ref}
        className={finalClassName}
        type={type ?? "button"}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };
