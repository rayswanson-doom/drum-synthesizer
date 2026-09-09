export function PlayGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      {/* Optically centered play triangle */}
      <path d="M9 6.8v10.4c0 .7.8 1.1 1.4.7l8.2-5.2c.6-.4.6-1.2 0-1.6L10.4 6.1c-.6-.4-1.4 0-1.4.7Z" />
    </svg>
  );
}
