import Image from "next/image";

export default function BrandLogo({
  size = 48,
  preload = false,
}: {
  size?: number;
  preload?: boolean;
}) {
  return (
    <Image
      src="/ilyas-logo.png"
      alt="Ilyas 1 Chicken Biryani"
      width={size}
      height={size}
      sizes={String(size) + "px"}
      preload={preload}
      style={{
        objectFit: "contain",
        flexShrink: 0,
        maxWidth: "100%",
        height: "auto",
      }}
    />
  );
}
