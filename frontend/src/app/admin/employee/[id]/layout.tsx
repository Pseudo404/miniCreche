export function generateStaticParams() {
  return [{ id: "__employee__" }];
}

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
