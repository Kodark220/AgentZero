import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import {
  Home,
  LayoutDashboard,
  Bot,
  Users,
  ListTodo,
  UserPlus,
  PlusCircle,
  Menu,
  X,
  Wallet,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useMode } from '../context/ModeContext';

const NAV_ITEMS = [
  { to: '/start', label: 'Start', icon: Home },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/agents', label: 'AI Agents', icon: Bot },
  { to: '/humans', label: 'Humans', icon: Users },
  { to: '/tasks', label: 'Tasks', icon: ListTodo },
  { to: '/register', label: 'Register', icon: UserPlus },
  { to: '/create-task', label: 'Create Task', icon: PlusCircle },
];

interface LayoutProps {
  children: React.ReactNode;
  walletAddress: string | null;
  onConnect: () => void;
  connectLoading?: boolean;
}

export default function Layout({ children, walletAddress, onConnect, connectLoading = false }: LayoutProps) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { mode } = useMode();

  return (
    <TooltipProvider>
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-50"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <Link to="/start" className="flex items-center gap-2.5 group">
                <motion.div
                  whileHover={{ rotate: 180, scale: 1.06 }}
                  transition={{ duration: 0.45, ease: 'easeInOut' }}
                  className="w-9 h-9 bg-gradient-to-br from-zinc-100 to-zinc-300 rounded-xl flex items-center justify-center text-black font-bold text-sm shadow-lg shadow-black/30"
                >
                  Ø
                </motion.div>
                <span className="text-xl font-bold text-foreground">
                  Agent<span className="text-zinc-300">Zero</span>
                </span>
              </Link>

              {/* Desktop Nav */}
              <nav className="hidden md:flex items-center gap-1 p-1.5 rounded-2xl border border-white/10 bg-white/[0.03]">
                {NAV_ITEMS.map((item) => {
                  const active = location.pathname === item.to;
                  return (
                    <Tooltip key={item.to}>
                      <TooltipTrigger asChild>
                        <Link
                          to={item.to}
                          className={cn(
                            'relative flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                            active
                              ? 'text-white'
                              : 'text-zinc-400 hover:text-zinc-100'
                          )}
                        >
                          <span
                            className={cn(
                              'inline-flex items-center justify-center w-6 h-6 rounded-md transition-colors',
                              active ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-300 group-hover:bg-zinc-800'
                            )}
                          >
                            <item.icon className="h-3.5 w-3.5" />
                          </span>
                          <span>{item.label}</span>
                          {active && (
                            <motion.div
                              layoutId="nav-indicator"
                              className="absolute inset-0 bg-white/10 border border-white/20 rounded-xl -z-10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]"
                              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                            />
                          )}
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent>{item.label}</TooltipContent>
                    </Tooltip>
                  );
                })}
              </nav>

              {/* Wallet + Mobile Toggle */}
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border bg-white/5 border-white/15 text-zinc-200">
                  Bradbury
                </div>

                {walletAddress ? (
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/15 text-zinc-200 text-sm font-medium"
                  >
                    <Wallet className="h-3.5 w-3.5" />
                    {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                  </motion.div>
                ) : (
                  <Button onClick={onConnect} size="sm" className="hidden sm:flex gap-2" disabled={connectLoading}>
                    <Wallet className="h-4 w-4" />
                    {connectLoading ? 'Connecting...' : 'Connect'}
                  </Button>
                )}

                {/* Mobile toggle */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setMobileOpen(!mobileOpen)}
                >
                  {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </Button>
              </div>
            </div>
          </div>

          {/* Mobile Nav */}
          <AnimatePresence>
            {mobileOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="md:hidden overflow-hidden border-t border-border"
              >
                <div className="px-4 py-3 space-y-1">
                  {NAV_ITEMS.map((item) => {
                    const active = location.pathname === item.to;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border',
                          active
                            ? 'bg-white/10 text-zinc-100 border-white/20'
                            : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/5 border-transparent'
                        )}
                      >
                        <span className={cn('inline-flex items-center justify-center w-6 h-6 rounded-md', active ? 'bg-white text-black' : 'bg-zinc-900 text-zinc-300')}>
                          <item.icon className="h-3.5 w-3.5" />
                        </span>
                        {item.label}
                      </Link>
                    );
                  })}
                  {!walletAddress && (
                    <Button onClick={onConnect} size="sm" className="w-full mt-2 gap-2" disabled={connectLoading}>
                      <Wallet className="h-4 w-4" />
                      {connectLoading ? 'Connecting...' : 'Connect Wallet'}
                    </Button>
                  )}
                  <div className="w-full flex items-center justify-center gap-2 mt-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all border bg-white/5 border-white/15 text-zinc-200">
                    Bradbury Mode
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.header>

        {/* Main */}
        <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-border py-6 text-center text-muted-foreground text-sm">
          <span className="opacity-60">AgentZero</span> — Trustless AI Agent Marketplace on{' '}
          {mode === 'genlayer' ? (
            <a
              href="https://genlayer.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-200 hover:text-white transition-colors"
            >
              GenLayer
            </a>
          ) : (
            <>
              <a
                href="https://base.org"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                Base
              </a>
              {' + '}
              <a
                href="https://genlayer.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-400 hover:text-brand-300 transition-colors"
              >
                GenLayer
              </a>
            </>
          )}
        </footer>
      </div>
    </TooltipProvider>
  );
}
