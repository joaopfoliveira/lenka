import Image from 'next/image';

export default function Logo({
  className = '',
  width = 400,
  height = 160,
}: {
  className?: string;
  width?: number;
  height?: number;
}) {
  return (
    <Image
      src="/lenka/lenka-logo.svg"
      alt="Lenka logo"
      width={width}
      height={height}
      className={className}
      priority
    />
  );
}
