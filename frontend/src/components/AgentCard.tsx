import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Shield, Activity, Zap, ExternalLink, Bot, User } from 'lucide-react';
import { cn } from '../lib/utils';

interface Agent {
  id: number;
  owner: string;
  name: string;
  description: string;
  endpoint: string;
  capabilities: string;
  provider_type: string;
  trust_score: number;
  total_tasks: number;
  successful_tasks: number;
  active: boolean;
}

interface AgentCardProps {
  agent: Agent;
  onAudit?: (id: number) => void;
  auditing?: boolean;
  index?: number;
}

function getTrustColor(score: number) {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-yellow-400';
  if (score >= 40) return 'text-orange-400';
  return 'text-red-400';
}

function getTrustRingColor(score: number) {
  if (score >= 80) return 'stroke-emerald-400';
  if (score >= 60) return 'stroke-yellow-400';
  if (score >= 40) return 'stroke-orange-400';
  return 'stroke-red-400';
}

function TrustRing({ score }: { score: number }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  return (
    <div className="relative w-[72px] h-[72px] flex-shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r={radius} fill="none" stroke="currentColor" strokeWidth="3" className="text-secondary" />
        <motion.circle
          cx="32" cy="32" r={radius} fill="none"
          strokeWidth="3" strokeLinecap="round"
          className={getTrustRingColor(score)}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('text-lg font-bold', getTrustColor(score))}>{score}</span>
        <span className="text-[10px] text-muted-foreground">Trust</span>
      </div>
    </div>
  );
}

export default function AgentCard({ agent, onAudit, auditing, index = 0 }: AgentCardProps) {
  const capabilities = agent.capabilities.split(',').map((c) => c.trim()).filter(Boolean);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: 'easeOut' }}
      whileHover={{ y: -2 }}
    >
      <Card className="group hover:border-brand-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-brand-500/5 overflow-hidden">
        {/* Subtle gradient glow on hover */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 mb-1">
                <Link
                  to={`/agents/${agent.id}`}
                  className="text-lg font-semibold text-foreground hover:text-brand-400 transition-colors truncate inline-flex items-center gap-1.5"
                >
                  {agent.name}
                  <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-50 transition-opacity" />
                </Link>
                {agent.active ? (
                  <Badge variant="success" className="gap-1">
                    <Activity className="h-3 w-3" />
                    Active
                  </Badge>
                ) : (
                  <Badge variant="secondary">Inactive</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground font-mono">
                {agent.owner.slice(0, 6)}...{agent.owner.slice(-4)}
              </p>
            </div>

            <div className="flex flex-col items-end gap-2">
              <Badge variant={agent.provider_type === 'human' ? 'warning' : 'info'} className="gap-1">
                {agent.provider_type === 'human' ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                {agent.provider_type === 'human' ? 'Human' : 'AI Agent'}
              </Badge>
              <TrustRing score={agent.trust_score} />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {agent.description}
          </p>

          <div className="flex flex-wrap gap-1.5">
            {capabilities.map((cap) => (
              <Badge key={cap} variant="brand" className="gap-1">
                <Zap className="h-3 w-3" />
                {cap}
              </Badge>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                {agent.successful_tasks}/{agent.total_tasks} tasks
              </span>
            </div>
            {onAudit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onAudit(agent.id)}
                disabled={auditing}
                className="gap-1.5 text-brand-400 hover:text-brand-300"
              >
                <Shield className="h-3.5 w-3.5" />
                {auditing ? 'Auditing...' : 'Audit'}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export type { Agent };
