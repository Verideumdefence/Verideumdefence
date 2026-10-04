import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    
    // Request statuses
    if (s === 'new') return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    if (s === 'reviewing') return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
    if (s === 'in progress') return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
    if (s === 'completed') return 'bg-green-500/10 text-green-400 border-green-500/30';
    if (s === 'rejected') return 'bg-red-500/10 text-red-400 border-red-500/30';
    
    // Project statuses
    if (s === 'planning') return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
    if (s === 'assessment') return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    if (s === 'investigation') return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
    if (s === 'testing') return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
    if (s === 'reporting') return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
    if (s === 'on hold') return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
    
    // Ticket statuses
    if (s === 'open') return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
    if (s === 'waiting for client') return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    if (s === 'resolved') return 'bg-green-500/10 text-green-400 border-green-500/30';
    if (s === 'closed') return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
    
    // Client statuses
    if (s === 'active') return 'bg-green-500/10 text-green-400 border-green-500/30';
    if (s === 'inactive') return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
    if (s === 'pending') return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30';
    if (s === 'suspended') return 'bg-red-500/10 text-red-400 border-red-500/30';
    
    // Default
    return 'bg-gray-500/10 text-gray-400 border-gray-500/30';
  };

  return (
    <div
      className={cn(
        'whitespace-nowrap inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors',
        getStatusColor(status),
        className
      )}
    >
      {status}
    </div>
  );
}
