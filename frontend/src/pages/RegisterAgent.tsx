import { useState } from 'react';
import type { MarketplaceAPI } from '../context/ModeContext';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Bot, Globe, Zap, AlertCircle, User } from 'lucide-react';

interface RegisterAgentProps {
  api: MarketplaceAPI | null;
  walletAddress: string | null;
}

export default function RegisterAgentPage({ api, walletAddress }: RegisterAgentProps) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    description: '',
    endpoint: '',
    capabilities: '',
    providerType: 'ai_agent' as string,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!api || !walletAddress) return;

    if (!form.name || !form.description || !form.endpoint || !form.capabilities) {
      setError('All fields are required');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await api.registerAgent(form.name, form.description, form.endpoint, form.capabilities, form.providerType);
      navigate('/agents');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  if (!api || !walletAddress) {
    return <p className="text-center text-muted-foreground py-20">Connect your wallet to register an agent.</p>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-2xl mx-auto"
    >
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-1">Register Provider</h1>
        <p className="text-muted-foreground">
          Register as an AI agent or human freelancer on the marketplace.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Bot className="h-5 w-5 text-brand-400" />
            Provider Details
          </CardTitle>
          <CardDescription>
            Once registered, you can be matched to tasks via on-chain AI.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                Provider Type
              </label>
              <Select value={form.providerType} onValueChange={(v) => setForm({ ...form, providerType: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ai_agent">
                    <span className="flex items-center gap-2"><Bot className="h-4 w-4" /> AI Agent</span>
                  </SelectItem>
                  <SelectItem value="human">
                    <span className="flex items-center gap-2"><User className="h-4 w-4" /> Human Freelancer</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Bot className="h-4 w-4 text-muted-foreground" />
                {form.providerType === 'human' ? 'Your Name' : 'Agent Name'}
              </label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={form.providerType === 'human' ? 'e.g. Jane Doe' : 'e.g. CodeAssistant Pro'}
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Description</label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={form.providerType === 'human' ? 'What skills do you offer? What makes you stand out?' : 'What does your agent do? What makes it unique?'}
                className="min-h-[100px] resize-y"
                maxLength={500}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground" />
                {form.providerType === 'human' ? 'Portfolio / Profile URL' : 'API Endpoint'}
              </label>
              <Input
                type="url"
                value={form.endpoint}
                onChange={(e) => setForm({ ...form, endpoint: e.target.value })}
                placeholder={form.providerType === 'human' ? 'https://yourportfolio.com' : 'https://api.youragent.com/v1'}
              />
              <p className="text-xs text-muted-foreground">
                {form.providerType === 'human'
                  ? 'Link to your portfolio or profile. Will be checked during trust audits.'
                  : 'The endpoint will be probed during trust audits to verify availability.'}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Zap className="h-4 w-4 text-muted-foreground" />
                Capabilities
              </label>
              <Input
                value={form.capabilities}
                onChange={(e) => setForm({ ...form, capabilities: e.target.value })}
                placeholder="code-generation, text-analysis, image-classification"
              />
              <p className="text-xs text-muted-foreground">Comma-separated list of capabilities.</p>
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
              ) : form.providerType === 'human' ? (
                <User className="h-4 w-4 mr-2" />
              ) : (
                <Bot className="h-4 w-4 mr-2" />
              )}
              {loading ? 'Registering...' : form.providerType === 'human' ? 'Register as Freelancer' : 'Register Agent'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
