import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router";
import { CheckCircle2, FolderKanban, Users, Calendar, BarChart3, ArrowRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Landing() {
  const { isLoading, isAuthenticated } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const features = [
    {
      icon: FolderKanban,
      title: t('landing.projectManagement'),
      description: t('landing.projectManagementDesc')
    },
    {
      icon: Users,
      title: t('landing.teamCollaboration'),
      description: t('landing.teamCollaborationDesc')
    },
    {
      icon: Calendar,
      title: t('landing.multipleViews'),
      description: t('landing.multipleViewsDesc')
    },
    {
      icon: BarChart3,
      title: t('landing.progressTracking'),
      description: t('landing.progressTrackingDesc')
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Navigation */}
      <nav className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="ProjecTrak" className="h-8 w-8" />
            <span className="text-xl font-bold tracking-tight">ProjecTrak</span>
          </div>
          <div className="flex items-center gap-3">
            {!isLoading && (
              <>
                {isAuthenticated ? (
                  <Button onClick={() => navigate("/dashboard")} className="shadow-md">
                    {t('navigation.dashboard')}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <>
                    <Button variant="ghost" onClick={() => navigate("/auth")}>
                      {t('auth.login')}
                    </Button>
                    <Button onClick={() => navigate("/auth")} className="shadow-md">
                      {t('auth.signUp')}
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-4xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <CheckCircle2 className="h-4 w-4" />
            {t('landing.materialDesign')}
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6">
            {t('landing.heroTitle')}
            <span className="text-primary">{t('landing.heroClarity')}</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            {t('landing.heroDesc')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={() => navigate("/auth")} className="shadow-lg text-lg px-8">
              {t('landing.startFree')}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" className="shadow-md text-lg px-8">
              {t('landing.learnMore')}
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            {t('landing.everythingYouNeed')}
          </h2>
          <p className="text-muted-foreground text-lg">
            {t('landing.comprehensiveTools')}
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="bg-card p-6 rounded-lg border shadow-md hover:shadow-lg transition-shadow"
            >
              <div className="p-3 bg-primary/10 rounded-lg w-fit mb-4">
                <feature.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="bg-primary text-primary-foreground rounded-2xl p-12 text-center shadow-xl"
        >
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            {t('landing.readyToGetStarted')}
          </h2>
          <p className="text-lg mb-8 opacity-90">
            {t('landing.joinTeams')}
          </p>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => navigate("/auth")}
            className="shadow-lg text-lg px-8"
          >
            {t('landing.createFreeAccount')}
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card/50 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2024 ProjecTrak. {t('landing.builtWith')} vly.ai</p>
        </div>
      </footer>
    </div>
  );
}
