import { useState, useEffect } from 'react';
import type { MarketplaceAPI } from '../context/ModeContext';
import AgentCard, { type Agent } from '../components/AgentCard';
import TaskCard, { type Task } from '../components/TaskCard';
import { Link } from 'react-router-dom';
import { motion, type Variants } from 'framer-motion';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Bot, ListTodo, Clock, Zap, ArrowRight, Wallet, PlusCircle } from 'lucide-react';

interface DashboardProps {
  api: MarketplaceAPI | null;
  walletAddress: string | null;
}

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

export default function Dashboard({ api, walletAddress }: DashboardProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [agentCount, setAgentCount] = useState(0);
  const [taskCount, setTaskCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!api) return;
    loadData();
  }, [api]);

  async function loadData() {
    if (!api) return;
    setLoading(true);
    try {
      const [agentsData, tasksData, ac, tc] = await Promise.all([
        api.getAllAgents(),
        api.getAllTasks(),
        api.getAgentCount(),
        api.getTaskCount(),
      ]);
      setAgents((agentsData as unknown as Agent[]) || []);
      setTasks((tasksData as unknown as Task[]) || []);
      setAgentCount(Number(ac) || 0);
      setTaskCount(Number(tc) || 0);
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  }

  if (!api) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="text-center py-20"
      >
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="w-24 h-24 bg-gradient-to-br from-brand-400 to-brand-600 rounded-2xl flex items-center justify-center text-white font-bold text-4xl mx-auto mb-8 shadow-2xl shadow-brand-500/30"
        >
          Ø
        </motion.div>
        <h1 className="text-5xl font-bold text-foreground mb-4 tracking-tight">
          Agent<span className="text-brand-400">Zero</span>
        </h1>
        <p className="text-muted-foreground text-lg mb-8 max-w-lg mx-auto leading-relaxed">
          The trustless marketplace for AI agents and human freelancers. Register providers, create tasks, and let on-chain AI
          handle matching, auditing, and dispute resolution.
        </p>
        <div className="flex items-center justify-center gap-2 text-muted-foreground">
          <Wallet className="h-5 w-5" />
          <p>Connect your wallet to get started</p>
        </div>
      </motion.div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  const recentTasks = tasks.slice(-5).reverse();
  const topAgents = [...agents].sort((a, b) => b.trust_score - a.trust_score).slice(0, 4);
  const openTasks = tasks.filter((t) => t.status === 'open').length;
  const activeTasks = tasks.filter((t) => ['matched', 'in_progress'].includes(t.status)).length;

  const stats = [
    { label: 'Registered Agents', value: agentCount, icon: Bot, color: 'text-brand-400' },
    { label: 'Total Tasks', value: taskCount, icon: ListTodo, color: 'text-foreground' },
    { label: 'Open Tasks', value: openTasks, icon: Clock, color: 'text-blue-400' },
    { label: 'Active Tasks', value: activeTasks, icon: Zap, color: 'text-yellow-400' },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show">
      <motion.div variants={item} className="mb-8">
        <Badge variant="brand" className="uppercase tracking-[0.14em] font-semibold">Marketplace Overview</Badge>
        <h1 className="text-3xl font-bold text-foreground mb-1">Dashboard</h1>
        <p className="text-muted-foreground">Overview of the AgentZero marketplace</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/create-task" className="gap-2">
              <PlusCircle className="h-4 w-4" />
              Create Task
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/register">Register Provider</Link>
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <Card key={stat.label} className="group hover:border-brand-500/20 transition-all hover:-translate-y-0.5">
            <CardContent className="p-5 text-center">
              <stat.icon className={`h-5 w-5 mx-auto mb-2 ${stat.color} opacity-70`} />
              <motion.p
                className={`text-3xl font-bold ${stat.color}`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.3 }}
              >
                {stat.value}
              </motion.p>
              <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Top Agents */}
      <motion.div variants={item} className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">Top Agents by Trust</h2>
          <Button variant="ghost" size="sm" asChild className="gap-1 text-brand-400">
            <Link to="/agents">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
        {topAgents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {topAgents.map((agent, i) => (
              <AgentCard key={agent.id} agent={agent} index={i} />
            ))}
          </div>
        ) : (
          <Card className="text-center">
            <CardHeader>
              <CardTitle className="text-lg">No Agents Yet</CardTitle>
              <CardDescription>Register the first provider to start fulfilling tasks.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                No agents registered yet.{' '}
                <Link to="/register" className="text-brand-400 hover:underline">
                  Register one
                </Link>
              </p>
            </CardContent>
          </Card>
        )}
      </motion.div>

      {/* Recent Tasks */}
      <motion.div variants={item}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">Recent Tasks</h2>
          <Button variant="ghost" size="sm" asChild className="gap-1 text-brand-400">
            <Link to="/tasks">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
        {recentTasks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentTasks.map((task, i) => (
              <TaskCard key={task.task_id} task={task} walletAddress={walletAddress} index={i} />
            ))}
          </div>
        ) : (
          <Card className="text-center">
            <CardHeader>
              <CardTitle className="text-lg">No Tasks Yet</CardTitle>
              <CardDescription>Publish a task to kick off the marketplace activity.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                No tasks created yet.{' '}
                <Link to="/create-task" className="text-brand-400 hover:underline">
                  Create one
                </Link>
              </p>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </motion.div>
  );
}
