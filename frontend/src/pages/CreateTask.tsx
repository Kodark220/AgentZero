import { useState } from 'react';
import type { MarketplaceAPI } from '../context/ModeContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ListTodo, Sparkles, AlertCircle, Bot, User, Users } from 'lucide-react';

interface CreateTaskProps {
  api: MarketplaceAPI | null;
  walletAddress: string | null;
}

export default function CreateTaskPage({ api, walletAddress }: CreateTaskProps) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    description: '',
    requiredCapability: '',
    preferredProvider: 'any' as string,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!api || !walletAddress) return;

    if (!form.description || !form.requiredCapability) {
      setError('All fields are required');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await api.createTask(form.description, form.requiredCapability, form.preferredProvider);
      navigate('/tasks');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Task creation failed');
    } finally {
      setLoading(false);
    }
  }

  if (!api || !walletAddress) {
    return <p className="text-center text-muted-foreground py-20">Connect your wallet to create a task.</p>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-2xl mx-auto"
    >
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-1">Create Task</h1>
        <p className="text-muted-foreground">
          Post a task and let the on-chain AI match it to the best available agent or freelancer.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ListTodo className="h-5 w-5 text-brand-400" />
            Task Details
          </CardTitle>
          <CardDescription>
            Be specific in your description for better AI-powered agent matching.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Task Description</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe what you need done. Be specific for better AI matching."
                className="min-h-[120px] resize-y"
                maxLength={1000}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-muted-foreground" />
                Required Capability
              </label>
              <Input
                value={form.requiredCapability}
                onChange={(e) => setForm({ ...form, requiredCapability: e.target.value })}
                placeholder="e.g. code-generation, text-analysis, data-processing"
              />
              <p className="text-xs text-muted-foreground">
                The primary capability needed. The AI will match providers with this skill.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Preferred Provider
              </label>
              <Select value={form.preferredProvider} onValueChange={(v) => setForm({ ...form, preferredProvider: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">
                    <span className="flex items-center gap-2"><Users className="h-4 w-4" /> Anyone (AI or Human)</span>
                  </SelectItem>
                  <SelectItem value="ai_agent">
                    <span className="flex items-center gap-2"><Bot className="h-4 w-4" /> AI Agent Only</span>
                  </SelectItem>
                  <SelectItem value="human">
                    <span className="flex items-center gap-2"><User className="h-4 w-4" /> Human Freelancer Only</span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Choose whether you want an AI agent, a human, or either.
              </p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 bg-destructive/10 border border-destructive/30 text-destructive rounded-lg p-3 text-sm"
              >
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </motion.div>
            )}

            <Button type="submit" disabled={loading} className="w-full" size="lg">
              {loading ? (
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />
              ) : (
                <ListTodo className="h-4 w-4 mr-2" />
              )}
              {loading ? 'Creating...' : 'Create Task'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
