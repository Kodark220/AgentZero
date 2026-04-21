import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import type { MarketplaceAPI } from '../context/ModeContext';
import type { Agent } from '../components/AgentCard';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Shield, Activity, Zap, Globe, User, CheckCircle2, BarChart3, Bot } from 'lucide-react';
import { cn } from '../lib/utils';

interface AgentProfileProps {
  api: MarketplaceAPI | null;
  walletAddress: string | null;
}

function getTrustColor(score: number) {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-yellow-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-red-400';
}

function getGrade(score: number) {
  if (score >= 80) return 'A';
  if (score >= 60) return 'B';
  if (score >= 40) return 'C';
  return 'D';
}

export default function AgentProfile({ api, walletAddress }: AgentProfileProps) {
  const { id } = useParams();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [auditing, setAuditing] = useState(false);

  useEffect(() => {
    if (api && id) loadAgent();
  }, [api, id]);

  async function loadAgent() {
    if (!api || !id) return;
    setLoading(true);
    try {
      const data = await api.getAgent(Number(id));
      setAgent(data as unknown as Agent);
    } catch (err) {
      console.error('Failed to load agent:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAudit() {
    if (!api || !agent || !walletAddress) return;
    setAuditing(true);
    try {
      await api.auditAgent(agent.id);
      await loadAgent();
    } catch (err) {
      console.error('Audit failed:', err);
    } finally {
      setAuditing(false);
    }
  }

  if (!api) {
    return <p className="text-center text-muted-foreground py-20">Connect your wallet.</p>;
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

  if (!agent) {
    return <p className="text-center text-muted-foreground py-20">Agent not found.</p>;
  }

  const capabilities = agent.capabilities.split(',').map((c) => c.trim()).filter(Boolean);
  const successRate =
    agent.total_tasks > 0
      ? Math.round((agent.successful_tasks / agent.total_tasks) * 100)
      : 0;

  const stats = [
    { label: 'Total Tasks', value: agent.total_tasks, icon: BarChart3, color: 'text-foreground' },
    { label: 'Successful', value: agent.successful_tasks, icon: CheckCircle2, color: 'text-emerald-400' },
    { label: 'Success Rate', value: `${successRate}%`, icon: Activity, color: 'text-foreground' },
    { label: 'Grade', value: getGrade(agent.trust_score), icon: Shield, color: getTrustColor(agent.trust_score) },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-3xl mx-auto space-y-6"
    >
      {/* Hero Card */}
      <Card className="overflow-hidden relative">
        {/* Gradient top border */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-400 via-brand-500 to-brand-600" />

        <CardHeader className="pt-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <motion.h1
                  initial={{ x: -10, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  className="text-3xl font-bold text-foreground"
                >
                  {agent.name}
                </motion.h1>
                {agent.active ? (
                  <Badge variant="success" className="gap-1">
                    <Activity className="h-3 w-3" />
                    Active
                  </Badge>
                ) : (
                  <Badge variant="secondary">Inactive</Badge>
                )}
                <Badge variant={agent.provider_type === 'human' ? 'warning' : 'info'} className="gap-1">
                  {agent.provider_type === 'human' ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                  {agent.provider_type === 'human' ? 'Human' : 'AI Agent'}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">Agent #{agent.id}</p>
            </div>

            {/* Trust Score Ring */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
              className="text-center"
            >
              <div className="relative w-20 h-20">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="4" className="text-secondary" />
                  <motion.circle
                    cx="40" cy="40" r="34" fill="none" strokeWidth="4" strokeLinecap="round"
                    className={getTrustColor(agent.trust_score).replace('text-', 'stroke-')}
                    strokeDasharray={2 * Math.PI * 34}
                    initial={{ strokeDashoffset: 2 * Math.PI * 34 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 34 * (1 - agent.trust_score / 100) }}
                    transition={{ duration: 1.2, ease: 'easeOut', delay: 0.4 }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={cn('text-2xl font-bold', getTrustColor(agent.trust_score))}>{agent.trust_score}</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Trust Score</p>
            </motion.div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <p className="text-muted-foreground leading-relaxed">{agent.description}</p>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.08 }}
                className="rounded-lg border border-border bg-secondary/30 p-3 text-center"
              >
                <stat.icon className={cn('h-4 w-4 mx-auto mb-1.5', stat.color, 'opacity-60')} />
                <p className={cn('text-xl font-bold', stat.color)}>{stat.value}</p>
                <p className="text-[11px] text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </div>

          {/* Capabilities */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Zap className="h-4 w-4" /> Capabilities
            </h3>
            <div className="flex flex-wrap gap-2">
              {capabilities.map((cap, i) => (
                <motion.div
                  key={cap}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + i * 0.05 }}
                >
                  <Badge variant="brand" className="gap-1 px-3 py-1">
                    <Zap className="h-3 w-3" />
                    {cap}
                  </Badge>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Endpoint */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Globe className="h-4 w-4" /> {agent.provider_type === 'human' ? 'Portfolio / Profile' : 'Endpoint'}
            </h3>
            <code className="text-sm text-foreground/80 bg-secondary rounded-lg px-3 py-2 block break-all font-mono">
              {agent.endpoint}
            </code>
          </div>

          {/* Owner */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <User className="h-4 w-4" /> Owner
            </h3>
            <code className="text-sm text-foreground/80 bg-secondary rounded-lg px-3 py-2 block break-all font-mono">
              {agent.owner}
            </code>
          </div>

          {/* Audit Button */}
          {walletAddress && (
            <Button onClick={handleAudit} disabled={auditing} size="lg" className="gap-2">
              {auditing ? (
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <Shield className="h-4 w-4" />
              )}
              {auditing ? 'Running AI Audit...' : 'Run Trust Audit (AI)'}
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
