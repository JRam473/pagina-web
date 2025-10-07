// components/ui/ExpandableText.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ExpandableTextProps {
  text: string;
  maxLength?: number;
  className?: string;
  showToggle?: boolean;
  renderText?: (text: string) => React.ReactNode;
}

export const ExpandableText = ({
  text,
  maxLength = 150,
  className,
  showToggle = true,
  renderText
}: ExpandableTextProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!text) return <span className="text-gray-500 italic text-sm">Sin descripción</span>;
  
  const needsTruncation = text.length > maxLength;
  const displayText = isExpanded || !needsTruncation ? text : `${text.slice(0, maxLength)}...`;

  return (
    <div className={cn("space-y-1", className)}>
      <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
        {renderText ? renderText(displayText) : displayText}
      </div>
      {needsTruncation && showToggle && (
        <Button
          variant="link"
          size="sm"
          onClick={() => setIsExpanded(!isExpanded)}
          className="h-auto p-0 text-blue-600 hover:text-blue-800 text-xs font-normal"
        >
          {isExpanded ? 'Ver menos' : 'Ver más'}
        </Button>
      )}
    </div>
  );
};