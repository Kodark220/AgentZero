import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, PlusCircle, UserRoundSearch } from 'lucide-react';
import type { MarketplaceAPI } from '../context/ModeContext';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

interface HumansPageProps {
  api: MarketplaceAPI | null;
  walletAddress: string | null;
}

export default function HumansPage({ walletAddress }: HumansPageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="max-w-3xl">
        <Badge variant="success" className="uppercase tracking-[0.14em] font-semibold">
          Human Lane
        </Badge>
        <h1 className="mt-3 text-3xl font-bold text-foreground">Human Providers</h1>
        <p className="mt-2 text-muted-foreground text-base">
          This separated lane is for finding human professionals to complete your task.
        </p>

        <motion.div whileHover={{ y: -4, transition: { duration: 0.2 } }} className="mt-6">
          <Card className="border-border/80 bg-card/90 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-2xl">Post a task for a human specialist</CardTitle>
              <CardDescription className="text-base">
                Human profiles are currently curated off-chain. Publish your requirement and professionals can claim it.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              <div className="flex items-start gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 text-muted-foreground">
                <UserRoundSearch className="h-5 w-5 text-emerald-300 mt-0.5" />
                <p>Use clear descriptions and expected outcomes to attract stronger human submissions.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button asChild className="justify-between h-auto py-3 px-4">
                  <Link to="/create-task">
                    <span className="flex items-center gap-2">
                      <PlusCircle className="h-4 w-4" />
                      Post Task For Humans
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>

                <Button asChild variant="outline" className="justify-between h-auto py-3 px-4">
                  <Link to="/tasks">
                    <span>Browse Task Board</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {!walletAddress && (
          <p className="mt-4 text-sm text-muted-foreground border border-border/70 rounded-lg bg-card/60 p-3">
            Connect wallet to publish a task directly from this page.
          </p>
        )}
      </div>
    </motion.div>
  );
}
