import { useState, useEffect } from 'react';
import type { MarketplaceAPI } from '../context/ModeContext';
import AgentCard, { type Agent } from '../components/AgentCard';
import { motion } from 'framer-motion';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Bot, RefreshCw, UserCheck } from 'lucide-react';

interface AgentsPageProps {
  api: MarketplaceAPI | null;
  walletAddress: string | null;
}

export default function AgentsPage({ api, walletAddress }: AgentsPageProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [auditingId, setAuditingId] = useState<number | null>(null);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('trust');

  useEffect(() => {
    if (api) loadAgents();
  }, [api]);

  async function loadAgents() {
    if (!api) return;
    setLoading(true);
    try {
      const data = await api.getAllAgents();
      setAgents((data as unknown as Agent[]) || []);
    } catch (err) {
      console.error('Failed to load agents:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAudit(agentId: number) {
    if (!api || !walletAddress) return;
    setAuditingId(agentId);
    try {
      await api.auditAgent(agentId);
      await loadAgents();
    } catch (err) {
      console.error('Audit failed:', err);
    } finally {
      setAuditingId(null);
    }
  }

  const filtered = agents
    .filter((a) => {
      if (filter === 'active') return a.active;
      if (filter === 'inactive') return !a.active;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'trust') return b.trust_score - a.trust_score;
      return b.total_tasks - a.total_tasks;
    });

  if (!api) {
    return (
      <Card className="max-w-xl mx-auto mt-12 text-center">
        <CardHeader>
          <CardTitle className="text-xl">Connect Wallet</CardTitle>
          <CardDescription>Connect your wallet to browse and audit providers.</CardDescription>
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
        <Badge variant="brand" className="uppercase tracking-[0.14em] font-semibold">Provider Discovery</Badge>
        <h1 className="text-3xl font-bold text-foreground mt-2">Providers</h1>
        <p className="text-muted-foreground">Browse AI agents and human freelancers</p>
      </motion.div>

      <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.35, delay: 0.05 }}>
        <Card className="border-border/80 bg-card/90 backdrop-blur-sm">
          <CardContent className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Bot className="h-4 w-4 text-brand-400" />
              <span>{filtered.length} providers shown</span>
              <UserCheck className="h-4 w-4 ml-2 text-emerald-400" />
              <span>{agents.filter((a) => a.active).length} active</span>
            </div>

            <div className="flex flex-wrap gap-2">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trust">Sort: Trust</SelectItem>
                  <SelectItem value="tasks">Sort: Tasks</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm" onClick={loadAgents} className="gap-2">
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
          <h2 className="text-xl font-semibold text-foreground">Provider List</h2>
          <p className="text-muted-foreground text-sm">Audit-ready list of available providers</p>
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
          {filtered.map((agent, i) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              index={i}
              onAudit={walletAddress ? handleAudit : undefined}
              auditing={auditingId === agent.id}
            />
          ))}
        </div>
      ) : (
        <Card className="text-center py-8">
          <CardHeader>
            <CardTitle className="text-lg">No Providers Found</CardTitle>
            <CardDescription>Adjust filters or refresh to try again.</CardDescription>
          </CardHeader>
        </Card>
      )}
      </motion.div>
    </motion.div>
  );
}
