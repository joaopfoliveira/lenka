import Image from "next/image";

export default function Logo({
  className = '',
  width = 360,
  height = 360,
}: {
  className?: string;
  width?: number;
  height?: number;
}) {
  return (
    <Image
      src="/icone.png"
      alt="Lenka logo"
      width={width}
      height={height}
      className={className}
      priority
    />
  );
}
