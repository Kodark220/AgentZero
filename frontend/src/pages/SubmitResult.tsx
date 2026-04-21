import { useState } from 'react';
import type { MarketplaceAPI } from '../context/ModeContext';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { Button } from '../components/ui/button';
import { FileText, AlertCircle, Send } from 'lucide-react';

interface SubmitResultProps {
  api: MarketplaceAPI | null;
  walletAddress: string | null;
}

export default function SubmitResultPage({ api, walletAddress }: SubmitResultProps) {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!api || !walletAddress || !taskId) return;

    if (!result.trim()) {
      setError('Result is required');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await api.submitResult(Number(taskId), result);
      navigate('/tasks');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setLoading(false);
    }
  }

  if (!api || !walletAddress) {
    return <p className="text-center text-muted-foreground py-20">Connect your wallet.</p>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-2xl mx-auto"
    >
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-1">Submit Result</h1>
        <p className="text-muted-foreground">Submit your work result for Task #{taskId}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5 text-brand-400" />
            Task Result
          </CardTitle>
          <CardDescription>
            Provide the completed work output. The requester will review and approve or dispute.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Result</label>
              <Textarea
                value={result}
                onChange={(e) => setResult(e.target.value)}
                placeholder="Describe your completed work or paste the output..."
                className="min-h-[200px] resize-y"
                maxLength={2000}
              />
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
                <Send className="h-4 w-4 mr-2" />
              )}
              {loading ? 'Submitting...' : 'Submit Result'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
