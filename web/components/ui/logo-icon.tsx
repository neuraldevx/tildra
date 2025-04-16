import Image from "next/image"

interface LogoIconProps {
  size?: number
  className?: string
}

export function LogoIcon({ size = 32, className = "" }: LogoIconProps) {
  return (
    <div className={`relative rounded-lg overflow-hidden ${className}`} style={{ width: size, height: size }}>
      <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary opacity-90"></div>
      <div className="absolute inset-0 flex items-center justify-center">
        <Image
          src="/images/logo.png"
          alt="Logo"
          width={size}
          height={size}
          className="w-full h-full object-contain p-1"
        />
      </div>
    </div>
  )
}
