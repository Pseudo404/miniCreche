export function generateStaticParams() {
  return [{ id: "__employee__" }];
}

export default function SignLayout({ children }: { children: React.ReactNode }) {
  return children;
}
