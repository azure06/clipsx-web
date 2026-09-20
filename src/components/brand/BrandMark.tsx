type BrandMarkProps = {
  className?: string;
  title?: string;
};

export function BrandMark({ className, title }: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 1920 1920"
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <path
        fill="currentColor"
        d="M1592.5 583.87c0-22.48-16.13-41.72-38.27-45.64L930.26 427.71l-1.08-.19-456.23-80.8c-28.39-5.03-54.44 16.81-54.44 45.64v678.92c0 26.65 22.42 47.82 49.03 46.28l419.05-24.25c24.52-1.42 43.68-21.72 43.68-46.28V808.45c0-26.69 22.48-47.86 49.11-46.27l564.01 33.63c26.64 1.59 49.11-19.59 49.11-46.27V583.87Z"
      />
      <path
        fill="currentColor"
        opacity=".72"
        d="M1243.94 836.57v212.87c0 20.91-16.29 38.2-37.17 39.45l-845.11 50.39c-20.88 1.24-37.17 18.54-37.17 39.45v315.63c0 24.58 22.21 43.2 46.41 38.91l873.03-154.62.84-.15 262.51-46.49c18.87-3.34 32.63-19.75 32.63-38.91V849.13c0-20.94-16.33-38.24-37.24-39.45l-216.94-12.55c-22.67-1.32-41.79 16.72-41.79 39.44Z"
      />
    </svg>
  );
}
