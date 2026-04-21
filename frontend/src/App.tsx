import { useState, useCallback, useEffect, useMemo } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { getClient } from './lib/genlayer';
import { createGenLayerAPI } from './lib/marketplace';
import { ModeContext, type AppMode, type MarketplaceAPI } from './context/ModeContext';
import Layout from './components/Layout';
import LandingPage from './pages/Landing';
import Dashboard from './pages/Dashboard';
import AgentsPage from './pages/AgentsPage';
import AgentProfile from './pages/AgentProfile';
import HumansPage from './pages/HumansPage';
import TasksPage from './pages/TasksPage';
import RegisterAgentPage from './pages/RegisterAgent';
import CreateTaskPage from './pages/CreateTask';
import SubmitResultPage from './pages/SubmitResult';

function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
    >
      {children}
    </motion.div>
  );
}

export default function App() {
  const location = useLocation();
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [connectLoading, setConnectLoading] = useState(false);
  const mode: AppMode = 'genlayer';

  const handleSetMode = useCallback(() => {
    localStorage.setItem('agentzero-mode', 'genlayer');
  }, []);

  useEffect(() => {
    localStorage.setItem('agentzero-mode', 'genlayer');

    // Support multiple EVM wallets: MetaMask, WalletConnect, OKX, and any standard EIP-1193 provider
    const eth = (window as {
      ethereum?: {
        on: (event: string, cb: (accounts: string[]) => void) => void;
        removeListener?: (event: string, cb: (accounts: string[]) => void) => void;
      };
      okxwallet?: {
        on: (event: string, cb: (accounts: string[]) => void) => void;
        removeListener?: (event: string, cb: (accounts: string[]) => void) => void;
      };
    }).ethereum || (window as any).okxwallet;

    if (eth) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          setWalletAddress(accounts[0] as `0x${string}`);
        } else {
          setWalletAddress(null);
        }
      };

      eth.on('accountsChanged', handleAccountsChanged);

      return () => {
        if (eth.removeListener) {
          eth.removeListener('accountsChanged', handleAccountsChanged);
        }
      };
    }
  }, []);

  const api: MarketplaceAPI | null = useMemo(() => {
    const client = getClient(walletAddress ?? undefined);
    return createGenLayerAPI(client);
  }, [walletAddress]);

  const connect = useCallback(async () => {
    // Support multiple EVM wallets: MetaMask, WalletConnect, OKX, and any standard EIP-1193 provider
    const eth = (window as any).ethereum || (window as any).okxwallet;
    if (!eth) {
      alert('Please install MetaMask, OKX Wallet, or another Web3 wallet.');
      return;
    }
    setConnectLoading(true);
    try {
      const accounts = await eth.request({ method: 'eth_requestAccounts' });
      if (accounts.length > 0) {
        setWalletAddress(accounts[0] as `0x${string}`);
      }
    } catch (err) {
      console.error('Wallet connection failed:', err);
    } finally {
      setConnectLoading(false);
    }
  }, []);

  const modeCtx = useMemo(() => ({
    mode,
    setMode: handleSetMode,
    api,
    walletAddress,
  }), [mode, handleSetMode, api, walletAddress]);

  const isStandaloneStartPage = location.pathname === '/start' || location.pathname === '/';

  return (
    <ModeContext.Provider value={modeCtx}>
      {isStandaloneStartPage ? (
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Navigate to="/start" replace />} />
            <Route path="/start" element={<PageTransition><LandingPage /></PageTransition>} />
          </Routes>
        </AnimatePresence>
      ) : (
        <Layout walletAddress={walletAddress} onConnect={connect} connectLoading={connectLoading}>
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/dashboard" element={<PageTransition><Dashboard api={api} walletAddress={walletAddress} /></PageTransition>} />
              <Route path="/agents" element={<PageTransition><AgentsPage api={api} walletAddress={walletAddress} /></PageTransition>} />
              <Route path="/humans" element={<PageTransition><HumansPage api={api} walletAddress={walletAddress} /></PageTransition>} />
              <Route path="/agents/:id" element={<PageTransition><AgentProfile api={api} walletAddress={walletAddress} /></PageTransition>} />
              <Route path="/tasks" element={<PageTransition><TasksPage api={api} walletAddress={walletAddress} /></PageTransition>} />
              <Route path="/register" element={<PageTransition><RegisterAgentPage api={api} walletAddress={walletAddress} /></PageTransition>} />
              <Route path="/create-task" element={<PageTransition><CreateTaskPage api={api} walletAddress={walletAddress} /></PageTransition>} />
              <Route path="/tasks/:taskId/submit" element={<PageTransition><SubmitResultPage api={api} walletAddress={walletAddress} /></PageTransition>} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </AnimatePresence>
        </Layout>
      )}
    </ModeContext.Provider>
  );
}
