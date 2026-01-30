import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useConvex } from "convex/react";
import { api } from "@convex/_generated/api";
import { AlertCircle, Loader2, Lock, Mail, User, CheckCircle2 } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";

function InviteAccept() {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const convex = useConvex();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("token");
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tokenValidated, setTokenValidated] = useState(false);
  const acceptInvite = useMutation(api.invites.accept);
  const invite = useQuery(api.invites.getByToken, { token: inviteToken || "" });

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [authLoading, isAuthenticated, navigate]);

  // Handle invalid or missing token
  useEffect(() => {
    if (!inviteToken) {
      toast.error("Link de convite inválido - token ausente");
      navigate("/auth", { replace: true });
      return;
    }

    // Validate token format (basic check)
    if (inviteToken.length < 10) {
      toast.error("Link de convite inválido - token malformado");
      navigate("/auth", { replace: true });
      return;
    }

    setTokenValidated(true);
  }, [inviteToken, navigate]);

  // Handle invalid invite data
  useEffect(() => {
    if (!tokenValidated) return;

    if (invite === null) {
      toast.error("Convite não encontrado ou inválido");
      setTimeout(() => navigate("/auth", { replace: true }), 2000);
    } else if (invite && invite.status !== "pending") {
      if (invite.status === "accepted") {
        toast.error("Este convite já foi aceito");
      } else if (invite.status === "cancelled") {
        toast.error("Este convite foi cancelado");
      } else {
        toast.error("Este convite não está mais disponível");
      }
      setTimeout(() => navigate("/auth", { replace: true }), 2000);
    }
  }, [invite, navigate, tokenValidated]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inviteToken || !invite) {
      setError("Token de convite inválido");
      return;
    }

    // Validate invite status again before proceeding
    if (invite.status !== "pending") {
      setError("Este convite não está mais disponível");
      toast.error("Convite inválido");
      return;
    }

    setIsLoading(true);
    setError(null);

    // Validate passwords
    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres");
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não coincidem");
      setIsLoading(false);
      return;
    }

    try {
      // Normalize email to lowercase for consistency
      const normalizedEmail = invite.email.toLowerCase().trim();
      
      // Check if user already exists before attempting sign-up
      const userExists = await convex.query(api.users.checkEmail, { email: normalizedEmail });
      if (userExists) {
        setError("Este email já está cadastrado. Por favor, faça login na página de autenticação.");
        toast.error("Email já cadastrado - faça login");
        setIsLoading(false);
        return;
      }
      
      // Create account with password
      const formData = new FormData();
      formData.append("email", normalizedEmail);
      formData.append("password", password);
      formData.append("name", invite.name);
      formData.append("flow", "signUp");

      try {
        // Sign up the user
        await signIn("password", formData);

        // Wait for authentication to complete and retry getting user
        let currentUser = null;
        let retries = 0;
        const maxRetries = 20; // Increased retries for better reliability
        
        while (!currentUser && retries < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 600));
          currentUser = await convex.query(api.users.currentUser, {});
          retries++;
        }

        if (!currentUser) {
          throw new Error("Falha ao obter dados do usuário após registro");
        }

        console.log("Current user retrieved:", { 
          id: currentUser._id, 
          email: currentUser.email,
          role: currentUser.role 
        });

        // Accept the invite and update role - with retry logic
        let inviteAccepted = false;
        let inviteRetries = 0;
        const maxInviteRetries = 8;
        
        while (!inviteAccepted && inviteRetries < maxInviteRetries) {
          try {
            if (!currentUser) {
              throw new Error("User data not available");
            }

            console.log(`Attempting to accept invite (attempt ${inviteRetries + 1}):`, {
              token: inviteToken,
              userId: currentUser._id,
              userEmail: currentUser.email,
              inviteEmail: invite.email
            });
            
            await acceptInvite({ token: inviteToken });
            inviteAccepted = true;
            toast.success("Conta criada e convite aceito! Bem-vindo à equipe!");
            
            // Wait a bit to ensure role is updated before navigation
            await new Promise(resolve => setTimeout(resolve, 500));
            navigate("/dashboard", { replace: true });
          } catch (inviteError) {
            inviteRetries++;
            console.error(`Failed to accept invite (attempt ${inviteRetries}):`, inviteError);
            const inviteErrorMsg = inviteError instanceof Error ? inviteError.message : String(inviteError);
            console.error("Invite error details:", inviteErrorMsg);
            
            // If it's an email mismatch or user not found, wait and retry
            if (inviteErrorMsg.includes("User email is not set") || inviteErrorMsg.includes("User not found") || inviteErrorMsg.includes("User data not available")) {
              if (inviteRetries < maxInviteRetries) {
                console.log("Waiting before retry...");
                await new Promise(resolve => setTimeout(resolve, 1200));
                // Refresh user data
                currentUser = await convex.query(api.users.currentUser, {});
                continue;
              }
            }
            
            // If max retries reached or other error, show warning
            if (inviteRetries >= maxInviteRetries || !inviteErrorMsg.includes("User email is not set")) {
              toast.warning("Conta criada com sucesso! Entre em contato com o administrador para atualizar suas permissões.");
              navigate("/dashboard", { replace: true });
              break;
            }
          }
        }
        
        // Exit the function successfully - don't fall through to the outer catch
        return;
      } catch (signUpError) {
        // Only handle actual sign-up errors here
        console.error("Sign-up error:", signUpError);
        const signUpErrorMsg = signUpError instanceof Error ? signUpError.message : String(signUpError);
        
        // If it's a user retrieval error after successful sign-up, still redirect
        if (signUpErrorMsg.includes("Falha ao obter dados do usuário")) {
          toast.warning("Conta criada! Faça login para continuar.");
          navigate("/auth", { replace: true });
          return;
        }
        
        // Otherwise, re-throw to be handled by outer catch
        throw signUpError;
      }
    } catch (error) {
      console.error("Registration error:", error);
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      // Check for specific error types
      if (errorMsg.includes("already in use") || errorMsg.includes("already exists") || errorMsg.includes("Email already")) {
        setError("Este email já está cadastrado. Por favor, faça login.");
        toast.error("Email já cadastrado");
      } else if (errorMsg.includes("InvalidAccountId") || errorMsg.includes("Invalid")) {
        // Try to check if user already exists and just needs to login
        const existingUser = await convex.query(api.users.checkEmail, { email: invite.email.toLowerCase() });
        if (existingUser) {
          setError("Este email já está cadastrado. Por favor, faça login na página de autenticação.");
          toast.error("Email já cadastrado - faça login");
        } else {
          setError("Erro ao criar conta. Por favor, tente novamente ou entre em contato com o suporte.");
          toast.error("Erro de validação");
        }
      } else if (errorMsg.includes("invite") && errorMsg.includes("used")) {
        setError("Este convite já foi utilizado.");
        toast.error("Convite já utilizado");
      } else {
        setError("Erro ao criar conta. Tente novamente.");
        toast.error("Erro ao criar conta");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state - show while validating token or fetching invite data
  if (!tokenValidated || !invite || invite === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <Card className="border-border/50 shadow-xl backdrop-blur-sm bg-card/95">
            <CardHeader className="text-center space-y-1 pb-4">
              <div className="flex justify-center mb-4">
                <div className="p-3 rounded-full bg-primary/10 ring-1 ring-primary/20">
                  <CheckCircle2 className="h-8 w-8 text-primary" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight">
                Complete seu Cadastro
              </CardTitle>
              <CardDescription className="text-base">
                Você foi convidado para se juntar ao ProjecTrak!
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      value={invite.name}
                      className="pl-9 h-10 bg-muted/50"
                      disabled
                      readOnly
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={invite.email}
                      className="pl-9 h-10 bg-muted/50"
                      disabled
                      readOnly
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">
                    Senha <span className="text-xs text-muted-foreground">(mínimo 8 caracteres)</span>
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-9 h-10"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      required
                      minLength={8}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      className="pl-9 h-10"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={isLoading}
                      required
                      minLength={8}
                    />
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="font-medium text-xs">{error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>

              <CardFooter className="flex-col gap-4 pb-6">
                <Button
                  type="submit"
                  className="w-full h-10 text-sm font-medium shadow-md hover:shadow-lg transition-all"
                  disabled={isLoading || !password || !confirmPassword}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Criando conta...</span>
                    </div>
                  ) : (
                    <span>Criar Conta e Aceitar Convite</span>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => navigate("/auth")}
                  disabled={isLoading}
                  className="w-full text-sm"
                >
                  Já tem uma conta? Faça login
                </Button>
              </CardFooter>
            </form>

            <div className="py-4 px-6 text-xs text-center text-muted-foreground bg-muted/50 border-t rounded-b-xl">
              Secured by{" "}
              <a
                href="https://vly.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium hover:text-primary transition-colors"
              >
                vly.ai
              </a>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

export default function InviteAcceptPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <InviteAccept />
    </Suspense>
  );
}
