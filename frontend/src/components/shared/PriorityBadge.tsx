import { cn } from '@/lib/utils';

interface PriorityBadgeProps {
  priority: string;
  className?: string;
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const getPriorityColor = (priority: string) => {
    const p = priority.toLowerCase();
    
    if (p === 'low') return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
    if (p === 'medium') return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    if (p === 'high') return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
    if (p === 'critical') return 'bg-red-500/10 text-red-400 border-red-500/30';
    
    return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
  };

  return (
    <div
      className={cn(
        'whitespace-nowrap inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors',
        getPriorityColor(priority),
        className
      )}
    >
      {priority}
    </div>
  );
}
