import { useState, useEffect } from 'react';
import type { MarketplaceAPI } from '../context/ModeContext';
import TaskCard, { type Task } from '../components/TaskCard';
import { motion } from 'framer-motion';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Clock3, ListTodo, RefreshCw } from 'lucide-react';

interface TasksPageProps {
  api: MarketplaceAPI | null;
  walletAddress: string | null;
}

export default function TasksPage({ api, walletAddress }: TasksPageProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (api) loadTasks();
  }, [api]);

  async function loadTasks() {
    if (!api) return;
    setLoading(true);
    try {
      const data = await api.getAllTasks();
      setTasks((data as unknown as Task[]) || []);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(action: () => Promise<unknown>) {
    setActionLoading(true);
    try {
      await action();
      await loadTasks();
    } catch (err) {
      console.error('Action failed:', err);
    } finally {
      setActionLoading(false);
    }
  }

  const filtered = tasks
    .filter((t) => statusFilter === 'all' || t.status === statusFilter)
    .reverse();

  if (!api) {
    return (
      <Card className="max-w-xl mx-auto mt-12 text-center">
        <CardHeader>
          <CardTitle className="text-xl">Connect Wallet</CardTitle>
          <CardDescription>Connect your wallet to manage task actions.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.35 }}>
        <Badge variant="info" className="uppercase tracking-[0.14em] font-semibold">Task Operations</Badge>
        <h1 className="text-3xl font-bold text-foreground mt-2">Task Board</h1>
        <p className="text-muted-foreground">Browse and manage tasks</p>
      </motion.div>

      <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.35, delay: 0.05 }}>
        <Card className="border-border/80 bg-card/90 backdrop-blur-sm">
          <CardContent className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <ListTodo className="h-4 w-4 text-blue-400" />
              <span>{filtered.length} tasks shown</span>
              <Clock3 className="h-4 w-4 ml-2 text-yellow-400" />
              <span>{tasks.filter((t) => t.status === 'open').length} open</span>
            </div>

            <div className="flex flex-wrap gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[170px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="matched">Matched</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="disputed">Disputed</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm" onClick={loadTasks} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.35, delay: 0.1 }}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.4 }}>
          <h2 className="text-xl font-semibold text-foreground">Task Stream</h2>
          <p className="text-muted-foreground text-sm">Live marketplace tasks and workflow actions</p>
        </motion.div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full"
          />
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((task, i) => (
            <TaskCard
              key={task.task_id}
              task={task}
              walletAddress={walletAddress}
              loading={actionLoading}
              index={i}
              onMatch={(id) => handleAction(() => api.matchAgentToTask(id))}
              onAccept={(id) => handleAction(() => api.acceptTask(id))}
              onApprove={(id) => handleAction(() => api.approveResult(id))}
              onDispute={(id) => handleAction(() => api.disputeResult(id, 'Quality issue'))}
              onResolve={(id) => handleAction(() => api.resolveDispute(id))}
            />
          ))}
        </div>
      ) : (
        <Card className="text-center py-8">
          <CardHeader>
            <CardTitle className="text-lg">No Tasks Found</CardTitle>
            <CardDescription>Try another status filter or create a new task.</CardDescription>
          </CardHeader>
        </Card>
      )}
      </motion.div>
    </motion.div>
  );
}
