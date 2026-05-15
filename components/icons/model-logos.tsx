import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

export function OpenAIMark(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
    </svg>
  );
}

export function ClaudeMark(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M13.827 3.52h3.603L24 20.481h-3.604l-1.327-3.42h-7.046l-1.328 3.42H7.092l6.735-16.96zm-.013 11.012h6.064l-3.032-7.81-3.032 7.81zM6.165 3.52h3.83L3.426 20.481H.007L6.165 3.52z" />
    </svg>
  );
}

export function GeminiMark(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M12 0c.667 5.067 2.6 7.733 6.6 9.4 1.6.6 3 .933 5.4 1.067-5 .333-8 1.467-10.2 5.066C12.6 17.467 12.4 19.667 12 24c-.4-4.333-.6-6.533-1.8-8.467C8 11.934 5 10.8 0 10.467c2.4-.134 3.8-.467 5.4-1.067C9.4 7.733 11.333 5.067 12 0z" />
    </svg>
  );
}

export function PerplexityMark(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M12.001 1.5 3 8.25v3h2.25v8.25h4.5v-5.25h4.5v5.25h4.5V11.25H21V8.25l-9-6.75zm0 2.617 6.75 5.063h-1.5v8.25h-1.5v-5.25h-7.5v5.25h-1.5V9.18h-1.5l6.75-5.063z" />
    </svg>
  );
}

const MAP: Record<string, (p: IconProps) => React.JSX.Element> = {
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
}: { model: string } & IconProps) {
  const key = model.toLowerCase();
  const Icon = MAP[key];
  if (Icon) return <Icon {...props} />;
  return null;
}
