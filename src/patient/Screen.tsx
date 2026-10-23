import { createContext, useContext, useEffect, type ReactNode } from "react";

export const SpeechContext = createContext<(text: string) => void>(() => {});

export function useReadAloud(text: string | undefined) {
  const setText = useContext(SpeechContext);
  useEffect(() => {
    if (text) setText(text);
  }, [text, setText]);
}

export function Screen({
  children,
  footer,
  speech,
  tone = "light",
  className = "",
}: {
  children: ReactNode;
  footer?: ReactNode;
  speech?: string;
  tone?: "light" | "dark";
  className?: string;
}) {
  useReadAloud(speech);
  return (
    <div className={`flex h-full flex-col ${tone === "dark" ? "bg-asphalt text-white" : "bg-canvas"}`}>
      <div className={`no-scrollbar flex-1 overflow-y-auto px-6 pt-3 pb-8 ${className}`}>{children}</div>
      {footer && <div className="flex flex-col gap-2 px-6 pt-2 pb-[calc(var(--safe-bottom,0px)+18px)]">{footer}</div>}
    </div>
  );
}

export function Title({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h1 className={`font-display text-[34px] leading-[1.08] font-extrabold tracking-[-0.015em] text-balance ${className}`}>{children}</h1>;
}

export function Lead({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`mt-3 text-[20px] leading-[1.45] text-graphite ${className}`}>{children}</p>;
}

export function Meta({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`text-[16px] font-semibold text-graphite ${className}`}>{children}</p>;
}
