// components/admin/CategoryDropdown.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CategoryDropdownProps {
  value: string;
  onValueChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  categories: string[];
}

export const CategoryDropdown = ({
  value,
  onValueChange,
  error,
  placeholder = "Selecciona una categoría",
  categories
}: CategoryDropdownProps) => {
  const [open, setOpen] = useState(false);

  const handleSelect = (category: string) => {
    onValueChange(category);
    setOpen(false);
  };

  return (
    <div className="space-y-2">
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-between border-blue-200 focus:border-blue-500",
              error && "border-red-500",
              !value && "text-muted-foreground"
            )}
          >
            <span>{value || placeholder}</span>
            <ChevronDown className="h-4 w-4 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          className="w-full max-h-60 overflow-y-auto bg-white border border-gray-200 shadow-lg"
          align="start"
        >
          {categories.map((category) => (
            <DropdownMenuItem
              key={category}
              onClick={() => handleSelect(category)}
              className="flex items-center justify-between cursor-pointer"
            >
              <span>{category}</span>
              {value === category && <Check className="h-4 w-4 text-blue-600" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};