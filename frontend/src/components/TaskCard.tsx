import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Sparkles, CheckCircle2, AlertTriangle, Scale, Play, FileText, Bot, User, Users } from 'lucide-react';

interface Task {
  task_id: number;
  requester: string;
  description: string;
  required_capability: string;
  assigned_agent_id: number;
  status: string;
  result: string;
  reward: number;
  creator_type: string;
  preferred_provider: string;
}

interface TaskCardProps {
  task: Task;
  walletAddress: string | null;
  onMatch?: (taskId: number) => void;
  onAccept?: (taskId: number) => void;
  onApprove?: (taskId: number) => void;
  onDispute?: (taskId: number) => void;
  onResolve?: (taskId: number) => void;
  loading?: boolean;
  assignedAgentOwner?: string;
  index?: number;
}

const STATUS_CONFIG: Record<string, { variant: 'info' | 'purple' | 'warning' | 'success' | 'destructive' | 'secondary'; icon: typeof Sparkles }> = {
  open: { variant: 'info', icon: Sparkles },
  matched: { variant: 'purple', icon: Play },
  in_progress: { variant: 'warning', icon: Play },
  completed: { variant: 'success', icon: CheckCircle2 },
  disputed: { variant: 'destructive', icon: AlertTriangle },
  resolved: { variant: 'secondary', icon: Scale },
};

export default function TaskCard({
  task,
  walletAddress,
  onMatch,
  onAccept,
  onApprove,
  onDispute,
  onResolve,
  loading,
  assignedAgentOwner,
  index = 0,
}: TaskCardProps) {
  const isRequester = walletAddress?.toLowerCase() === task.requester.toLowerCase();
  const isAssignedAgent =
    assignedAgentOwner && walletAddress?.toLowerCase() === assignedAgentOwner.toLowerCase();

  const statusConf = STATUS_CONFIG[task.status] || STATUS_CONFIG.open;
  const StatusIcon = statusConf.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: 'easeOut' }}
      whileHover={{ y: -2 }}
    >
      <Card className="group hover:border-brand-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-brand-500/5 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

        <CardHeader className="pb-3">
          <div className="flex items-start justify-between mb-1">
            <h3 className="text-base font-semibold text-foreground">Task #{task.task_id}</h3>
            <Badge variant={statusConf.variant} className="gap-1">
              <StatusIcon className="h-3 w-3" />
              {task.status.replace('_', ' ')}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
            {task.description}
          </p>

          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="brand" className="gap-1">
              <Sparkles className="h-3 w-3" />
              {task.required_capability}
            </Badge>
            {task.creator_type && (
              <Badge variant={task.creator_type === 'client' ? 'secondary' : task.creator_type === 'human' ? 'warning' : 'info'} className="gap-1">
                {task.creator_type === 'human' ? <User className="h-3 w-3" /> : task.creator_type === 'ai_agent' ? <Bot className="h-3 w-3" /> : <Users className="h-3 w-3" />}
                {task.creator_type === 'client' ? 'Client' : task.creator_type === 'human' ? 'Human' : 'AI Agent'}
              </Badge>
            )}
            {task.preferred_provider && task.preferred_provider !== 'any' && (
              <Badge variant="outline" className="gap-1">
                Wants: {task.preferred_provider === 'human' ? 'Human' : 'AI'}
              </Badge>
            )}
            {task.assigned_agent_id > 0 && (
              <Link to={`/agents/${task.assigned_agent_id}`}>
                <Badge variant="outline" className="hover:bg-accent transition-colors cursor-pointer">
                  Agent #{task.assigned_agent_id}
                </Badge>
              </Link>
            )}
          </div>

          {task.result && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="rounded-lg border border-border bg-secondary/50 p-3"
            >
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <FileText className="h-3 w-3" /> Result
              </p>
              <p className="text-sm text-foreground/80 line-clamp-3">{task.result}</p>
            </motion.div>
          )}

          <div className="text-xs text-muted-foreground font-mono">
            {task.requester.slice(0, 6)}...{task.requester.slice(-4)}
          </div>

          {/* Actions */}
          <div className="flex gap-2 flex-wrap pt-2 border-t border-border">
            {task.status === 'open' && isRequester && onMatch && (
              <Button size="sm" onClick={() => onMatch(task.task_id)} disabled={loading} className="gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                {loading ? 'Matching...' : 'Find Agent (AI)'}
              </Button>
            )}
            {task.status === 'matched' && isAssignedAgent && onAccept && (
              <Button size="sm" onClick={() => onAccept(task.task_id)} disabled={loading} className="gap-1.5">
                <Play className="h-3.5 w-3.5" />
                {loading ? 'Accepting...' : 'Accept Task'}
              </Button>
            )}
            {task.status === 'in_progress' && isAssignedAgent && (
              <Button size="sm" variant="outline" asChild className="gap-1.5">
                <Link to={`/tasks/${task.task_id}/submit`}>
                  <FileText className="h-3.5 w-3.5" />
                  Submit Result
                </Link>
              </Button>
            )}
            {task.status === 'completed' && isRequester && onApprove && (
              <Button size="sm" onClick={() => onApprove(task.task_id)} disabled={loading} className="gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {loading ? 'Approving...' : 'Approve'}
              </Button>
            )}
            {task.status === 'completed' && isRequester && onDispute && (
              <Button size="sm" variant="destructive" onClick={() => onDispute(task.task_id)} disabled={loading} className="gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" />
                {loading ? 'Disputing...' : 'Dispute'}
              </Button>
            )}
            {task.status === 'disputed' && onResolve && (
              <Button size="sm" variant="secondary" onClick={() => onResolve(task.task_id)} disabled={loading} className="gap-1.5">
                <Scale className="h-3.5 w-3.5" />
                {loading ? 'Resolving...' : 'Resolve (AI)'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export type { Task };
