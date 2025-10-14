// src/components/Breadcrumbs.tsx
import { Link } from "react-router-dom";

interface BreadcrumbItem {
  label: string;
  path?: string; // si no tiene path, es el actual
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav
      className="text-lg text-gray-00 font-bold"
      aria-label="Breadcrumb"
    >
      <ol className="flex flex-wrap items-center space-x-2 mb-6">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="flex items-center">
              {!isLast && item.path ? (
                <Link
                  to={item.path}
                  className="text-orange-600 hover:underline"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-gray-800 font-medium">{item.label}</span>
              )}
              {!isLast && (
                <span className="mx-6 text-gray-400">/</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
