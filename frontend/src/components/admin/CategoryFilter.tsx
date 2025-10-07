// components/admin/CategoryFilter.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Filter, Check } from 'lucide-react';

interface CategoryFilterProps {
  value: string;
  onValueChange: (value: string) => void;
  categories: string[];
}

export const CategoryFilter = ({
  value,
  onValueChange,
  categories
}: CategoryFilterProps) => {
  const [open, setOpen] = useState(false);

  const handleSelect = (categoryValue: string) => {
    onValueChange(categoryValue);
    setOpen(false);
  };

  const displayValue = value === 'all' ? 'Todas las categorías' : value;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="w-full justify-start border-blue-200 focus:border-blue-500">
          <Filter className="h-4 w-4 mr-2 text-blue-500" />
          <span className="truncate">{displayValue}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="w-full max-h-60 overflow-y-auto bg-white border border-gray-200 shadow-lg"
        align="start"
      >
        <DropdownMenuItem
          onClick={() => handleSelect('all')}
          className="flex items-center justify-between cursor-pointer"
        >
          <span>Todas las categorías</span>
          {value === 'all' && <Check className="h-4 w-4 text-blue-600" />}
        </DropdownMenuItem>
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
  );
};