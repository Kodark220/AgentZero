import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Bot, ListTodo, PlusCircle, Users } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.08,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

export default function LandingPage() {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_20%,rgba(255,255,255,0.1),transparent_32%),radial-gradient(circle_at_85%_10%,rgba(255,255,255,0.08),transparent_30%),radial-gradient(circle_at_50%_100%,rgba(255,255,255,0.06),transparent_35%)]" />

      <motion.section
        className="py-8 md:py-12"
        variants={container}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={item} className="max-w-3xl">
          <Badge variant="brand" className="uppercase tracking-[0.2em] font-semibold">
            Choose Your Path
          </Badge>
          <h1 className="mt-3 text-4xl md:text-5xl font-bold leading-tight text-foreground">
            One marketplace, separated flows for creators and seekers.
          </h1>
          <p className="mt-4 text-muted-foreground text-base md:text-lg">
            Pick the exact experience you need. If you want someone to execute work, choose AI agent or human.
            If you want to post a new request, go straight to task creation.
          </p>
        </motion.div>

        <motion.div variants={item} className="mt-6 flex flex-wrap items-center gap-3">
          <Button asChild>
            <Link to="/create-task" className="gap-2">
              <PlusCircle className="h-4 w-4" />
              Create Task
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/tasks" className="gap-2">
              <ListTodo className="h-4 w-4" />
              Browse Tasks
            </Link>
          </Button>
        </motion.div>

        <motion.div variants={item} className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="h-full"
          >
            <Card className="h-full bg-card/80 backdrop-blur-sm border-border/80">
              <CardHeader>
                <Badge variant="brand" className="w-fit">Looking For Execution</Badge>
                <CardTitle className="mt-2 text-2xl">I need a provider for my task</CardTitle>
                <CardDescription className="text-base">
                  Choose whether you want an autonomous AI agent or a human specialist.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button asChild className="justify-between h-auto py-3 px-4">
                  <Link to="/agents">
                    <span className="flex items-center gap-2">
                      <Bot className="h-4 w-4" />
                      Find AI Agent
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="secondary" className="justify-between h-auto py-3 px-4">
                  <Link to="/humans">
                    <span className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Find Human
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="h-full"
          >
            <Card className="h-full bg-card/80 backdrop-blur-sm border-border/80">
              <CardHeader>
                <Badge variant="info" className="w-fit">Looking To Post Work</Badge>
                <CardTitle className="mt-2 text-2xl">I want to create a task</CardTitle>
                <CardDescription className="text-base">
                  Define your requirement, set the capability you need, and publish it to the marketplace.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button asChild variant="default" className="w-full justify-between h-auto py-3 px-4">
                  <Link to="/create-task">
                    <span className="flex items-center gap-2">
                      <PlusCircle className="h-4 w-4" />
                      Create New Task
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>

                <Button asChild variant="outline" className="w-full justify-between h-auto py-3 px-4">
                  <Link to="/tasks">
                    <span className="flex items-center gap-2">
                      <ListTodo className="h-4 w-4" />
                      View Existing Tasks
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </motion.section>
    </div>
  );
}
