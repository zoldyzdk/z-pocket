import Image from "next/image";

export function GoogleIcon() {
  return (
    <div className="max-w-6">
      <Image src="/google.svg" alt="Google Icon" width={24} height={24} />
    </div>
  )
}
