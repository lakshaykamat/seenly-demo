import type { ImgHTMLAttributes } from "react";

type MarkProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> & {
  alt?: string;
};

function BrandImg({
  src,
  alt,
  className,
  ...props
}: MarkProps & { src: string; alt: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      decoding="async"
      loading="lazy"
      draggable={false}
      className={
        className
          ? `${className} object-contain shrink-0 select-none`
          : "object-contain shrink-0 select-none"
      }
      {...props}
    />
  );
}

export function OpenAIMark(props: MarkProps) {
  return (
    <BrandImg
      src="/icons8-chatgpt-50.png"
      alt={props.alt ?? "ChatGPT"}
      {...props}
    />
  );
}

export function ClaudeMark(props: MarkProps) {
  return (
    <BrandImg
      src="/icons8-claude-ai-48.png"
      alt={props.alt ?? "Claude"}
      {...props}
    />
  );
}

export function GeminiMark(props: MarkProps) {
  return (
    <BrandImg
      src="/icons8-gemini-48.png"
      alt={props.alt ?? "Gemini"}
      {...props}
    />
  );
}

export function PerplexityMark(props: MarkProps) {
  return (
    <BrandImg
      src="/icons8-perplexity-ai-48.png"
      alt={props.alt ?? "Perplexity"}
      {...props}
    />
  );
}

const MAP: Record<string, (p: MarkProps) => React.JSX.Element> = {
  chatgpt: OpenAIMark,
  openai: OpenAIMark,
  "gpt-4o": OpenAIMark,
  claude: ClaudeMark,
  "claude-sonnet-4-6": ClaudeMark,
  anthropic: ClaudeMark,
  gemini: GeminiMark,
  "gemini-2.5-pro": GeminiMark,
  google: GeminiMark,
  perplexity: PerplexityMark,
  "perplexity-online": PerplexityMark,
};

export function ModelMark({
  model,
  ...props
}: { model: string } & MarkProps) {
  const key = model.toLowerCase();
  const Icon = MAP[key];
  if (Icon) return <Icon {...props} />;
  return null;
}
