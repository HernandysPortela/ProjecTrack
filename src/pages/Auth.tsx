import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useAuth } from "@/hooks/use-auth";
import { useConvex, useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { AlertCircle, ArrowRight, Loader2, Mail, User, Lock, CheckCircle2 } from "lucide-react";
import { Suspense, useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

// Helper for user-friendly error messages
function getFriendlyErrorMessage(error: unknown, flow: "signIn" | "signUp" | "otp" | "reset") {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("Invalid login credentials") || message.includes("Invalid credentials")) {
    return "Email ou senha incorretos. Por favor, tente novamente.";
  }
  if (message.includes("User not found")) {
    return "Conta não encontrada. Verifique o email ou crie uma conta.";
  }
  if (message.includes("Password is too short")) {
    return "A senha deve ter pelo menos 8 caracteres.";
  }
  if (message.includes("Password must contain")) {
    return message; // Return the specific validation message
  }
  if (message.includes("Email already in use")) {
    return "Este email já está em uso. Por favor, faça login.";
  }
  if (message.includes("Request timed out")) {
    return "A solicitação demorou muito. Verifique sua conexão e tente novamente.";
  }
  if (message.includes("NetworkError") || message.includes("Failed to fetch")) {
    return "Erro de conexão. Verifique sua internet.";
  }
  if (message.includes("Invalid code")) {
    return "Código de verificação inválido ou expirado.";
  }
  if (message.includes("InvalidSecret") || message.includes("[CONVEX A(")) {
    return "Email ou senha incorretos. Por favor, tente novamente.";
  }

  switch (flow) {
    case "signIn":
      return "Falha no login. Verifique suas credenciais e tente novamente.";
    case "signUp":
      return "Não foi possível criar a conta. Revise os dados e tente novamente.";
    case "otp":
      return "Erro ao verificar o código. Tente novamente.";
    case "reset":
      return "Erro ao redefinir a senha. Confira as informações e tente outra vez.";
    default:
      return "Ocorreu um erro inesperado. Tente novamente.";
  }
}

interface AuthProps {
  redirectAfterAuth?: string;
}

// Password validation helper
const validatePasswordSecurity = (password: string) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (password.length < minLength) {
    return "A senha deve ter pelo menos 8 caracteres.";
  }
  if (!hasUpperCase) {
    return "A senha deve conter pelo menos uma letra maiúscula.";
  }
  if (!hasNumber) {
    return "A senha deve conter pelo menos um número.";
  }
  if (!hasSpecialChar) {
    return "A senha deve conter pelo menos um caractere especial (!@#$%^&*).";
  }
  return null;
};

function Auth({ redirectAfterAuth }: AuthProps = {}) {
  const { isLoading: authLoading, isAuthenticated, signIn } = useAuth();
  const { t } = useLanguage();
  const convex = useConvex();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get("invite");

  const [step, setStep] = useState<"signIn" | "password" | { email: string } | "forgot-password" | { email: string, mode: "reset-verification" } | { email: string, mode: "signup-verification" }>("password");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passwordFlow, setPasswordFlow] = useState<"signIn" | "signUp">("signIn");
  const [passwordEmail, setPasswordEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [name, setName] = useState("");
  const [isNavigating, setIsNavigating] = useState(false);
  const isMounted = useRef(true);
  const notifyPasswordReset = useMutation(api.users.notifyPasswordResetSuccess);
  const acceptInvite = useMutation(api.invites.accept);
  const getInvite = useQuery(api.invites.getByToken, {
    token: new URLSearchParams(window.location.search).get("token") || ""
  });

  // Check if invite token is valid
  const inviteData = useQuery(
    api.invites.getByToken,
    inviteToken ? { token: inviteToken } : "skip"
  );

  // Effect to handle invite token on page load
  useEffect(() => {
    if (inviteToken && inviteData) {
      if (inviteData.status === "pending") {
        // Pre-fill the registration form with invite data
        setPasswordFlow("signUp");
        setPasswordEmail(inviteData.email);
        setName(inviteData.name);
        toast.info(t('auth.completeRegistrationForInvite'));
      } else {
        toast.error(t('auth.invalidInvite'));
      }
    }
  }, [inviteToken, inviteData]);

  // Helper for timeouts (20s default for production stability)
  const withTimeout = <T,>(promise: Promise<T>, ms: number = 20000) =>
    Promise.race([
      promise,
      new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Request timed out")), ms))
    ]);

  // Debounce email for checking existence
  const [debouncedEmail, setDebouncedEmail] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedEmail(passwordEmail.trim().toLowerCase());
    }, 500);
    return () => clearTimeout(timer);
  }, [passwordEmail]);

  // Check if email exists (proactive check)
  const existingUser = useQuery(api.users.checkEmail,
    passwordFlow === "signUp" && debouncedEmail.length > 3
      ? { email: debouncedEmail }
      : "skip"
  );

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    const handleAuthenticatedWithInvite = async () => {
      if (!authLoading && isAuthenticated && !isNavigating) {
        // If there's an invite token, accept it before redirecting
        if (inviteToken) {
          try {
            const currentUser = await convex.query(api.users.currentUser, {});
            if (currentUser) {
              await acceptInvite({ token: inviteToken });
              toast.success(t('auth.inviteAccepted'));
            }
          } catch (inviteError) {
            console.error("Failed to accept invite:", inviteError);
            // Only show warning if it's not already accepted
            const errorMsg = inviteError instanceof Error ? inviteError.message : String(inviteError);
            if (!errorMsg.includes("already been used")) {
              toast.warning(t('auth.errorAcceptingInvite'));
            }
          }
        }

        setIsNavigating(true);
        const redirect = redirectAfterAuth || "/";
        navigate(redirect, { replace: true });
      }
    };

    handleAuthenticatedWithInvite();
  }, [authLoading, isAuthenticated, navigate, redirectAfterAuth, isNavigating, inviteToken, acceptInvite, convex]);

  const handleEmailSubmit = async (email: string) => {
    if (isNavigating) return;
    if (!navigator.onLine) {
      const msg = "Você está offline. Verifique sua conexão com a internet.";
      setError(msg);
      toast.error(msg);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const emailToCheck = email.trim();
      const normalizedEmail = emailToCheck.toLowerCase();
      let emailToSend = normalizedEmail;

      // Smart resolution for OTP: Check exact match first, then lowercase
      try {
        const exactMatch = await withTimeout(
          convex.query(api.users.checkEmail, { email: emailToCheck }),
          5000 // Short timeout for check
        );

        if (exactMatch) {
          emailToSend = emailToCheck;
          console.log("Using exact match email for OTP");
        } else {
          const lowerMatch = await withTimeout(
            convex.query(api.users.checkEmail, { email: normalizedEmail }),
            5000 // Short timeout for check
          );

          if (lowerMatch) {
            emailToSend = normalizedEmail;
            console.log("Using lowercase email for OTP");
          }
        }
      } catch (err) {
        console.error("Error checking email for OTP:", err);
        // Fallback to normalized if check fails
      }

      const formData = new FormData();
      formData.append("email", emailToSend);

      // Add timeout to prevent hanging
      await withTimeout(signIn("email-otp", formData), 15000);

      if (isMounted.current && !isNavigating) {
        setStep({ email: emailToSend });
        toast.success(t('auth.emailCodeSent'));
      }
    } catch (error) {
      console.error("Email sign-in error:", error);
      if (isMounted.current && !isNavigating) {
        const msg = getFriendlyErrorMessage(error, "otp");
        setError(msg);
        toast.error(msg);
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isNavigating) return;
    if (!navigator.onLine) {
      const msg = "Você está offline. Verifique sua conexão com a internet.";
      setError(msg);
      toast.error(msg);
      return;
    }

    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;

    if (!email) {
      setError(t('auth.enterEmail'));
      setIsLoading(false);
      return;
    }

    try {
      const emailToCheck = email.trim();
      const normalizedEmail = emailToCheck.toLowerCase();
      let emailToSend = normalizedEmail;

      // Smart resolution for Password Reset
      try {
        // Check exact match first
        const exactMatch = await withTimeout(
          convex.query(api.users.checkEmail, { email: emailToCheck }),
          5000
        );

        if (exactMatch) {
          emailToSend = emailToCheck;
        } else {
          // Check lowercase match
          const lowerMatch = await withTimeout(
            convex.query(api.users.checkEmail, { email: normalizedEmail }),
            5000
          );
          if (lowerMatch) {
            emailToSend = normalizedEmail;
          }
        }
      } catch (err) {
        console.error("Error resolving email for reset:", err);
      }

      formData.set("email", emailToSend);
      formData.set("flow", "reset");

      await withTimeout(signIn("password", formData), 15000);

      if (isMounted.current) {
        setStep({ email: emailToSend, mode: "reset-verification" });
        toast.success(t('auth.passwordResetSent'));
      }
    } catch (error) {
      console.error("Password reset request error:", error);
      if (isMounted.current) {
        const msg = getFriendlyErrorMessage(error, "reset");
        setError(msg);
        toast.error(msg);
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  };

  const handleResetVerificationSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isNavigating) return;
    if (!navigator.onLine) {
      const msg = "Você está offline. Verifique sua conexão com a internet.";
      setError(msg);
      toast.error(msg);
      return;
    }

    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    // email is already in the form as hidden input
    formData.set("flow", "reset-verification");

    // Validate new password security
    const newPasswordInput = formData.get("newPassword") as string;
    const passwordError = validatePasswordSecurity(newPasswordInput);
    if (passwordError) {
      setError(passwordError);
      toast.error(passwordError);
      setIsLoading(false);
      return;
    }

    try {
      // Add timeout
      await withTimeout(signIn("password", formData), 15000);

      // Send confirmation email
      try {
        await notifyPasswordReset();
      } catch (emailError) {
        console.error("Failed to send password reset confirmation:", emailError);
      }

      toast.success(t('auth.passwordResetSuccess'));

      if (isMounted.current && !isNavigating) {
        setIsNavigating(true);
        const redirect = redirectAfterAuth || "/";
        navigate(redirect);
      }
    } catch (error) {
      console.error("Password reset verification error:", error);
      if (isMounted.current && !isNavigating) {
        const msg = getFriendlyErrorMessage(error, "reset");
        setError(msg);
        toast.error(msg);
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  };

  const handleSignupVerificationSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isNavigating) return;
    if (!navigator.onLine) {
      const msg = "Você está offline. Verifique sua conexão com a internet.";
      setError(msg);
      toast.error(msg);
      return;
    }

    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    try {
      // Verify the OTP code using email-otp provider
      await withTimeout(signIn("email-otp", formData), 15000);

      toast.success(t('auth.emailVerified'));

      if (isMounted.current && !isNavigating) {
        setIsNavigating(true);
        const redirect = redirectAfterAuth || "/";
        navigate(redirect, { replace: true });
      }
    } catch (error) {
      console.error("Email verification error:", error);
      if (isMounted.current && !isNavigating) {
        const msg = getFriendlyErrorMessage(error, "otp");
        setError(msg);
        toast.error(msg);
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  };

  const handleOtpSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isNavigating) return;
    if (!navigator.onLine) {
      const msg = "Você está offline. Verifique sua conexão com a internet.";
      setError(msg);
      toast.error(msg);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData(event.currentTarget);
      // Ensure we use the email exactly as it was resolved in the previous step
      // Do NOT force lowercase here, as it might break legacy mixed-case emails
      const rawEmail = formData.get("email") as string;
      if (rawEmail) {
        formData.set("email", rawEmail.trim());
      }

      // Add timeout
      await withTimeout(signIn("email-otp", formData), 15000);

      console.log("signed in");
      toast.success("Login realizado com sucesso!");
      if (!isNavigating) {
        setIsNavigating(true);
        const redirect = redirectAfterAuth || "/";
        navigate(redirect, { replace: true });
      }
    } catch (error) {
      console.error("OTP verification error:", error);

      if (!isNavigating) {
        const msg = getFriendlyErrorMessage(error, "otp");
        setError(msg);
        toast.error(msg);
        setOtp("");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isNavigating) return;
    if (!navigator.onLine) {
      const msg = "Você está offline. Verifique sua conexão com a internet.";
      setError(msg);
      toast.error(msg);
      return;
    }

    setIsLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);

    // Normalize email to ensure consistent validation and storage
    const rawEmail = formData.get("email") as string;
    const emailToCheck = rawEmail ? rawEmail.trim() : "";
    const normalizedEmail = emailToCheck.toLowerCase();

    // Validate password security for Sign Up
    if (passwordFlow === "signUp") {
      const passwordInput = formData.get("password") as string;
      const passwordError = validatePasswordSecurity(passwordInput);
      if (passwordError) {
        setError(passwordError);
        toast.error(passwordError);
        setIsLoading(false);
        return;
      }
    }

    try {
      if (passwordFlow === "signIn") {
        // Smart email resolution for Sign In to support legacy mixed-case emails
        try {
          // Check exact match first with timeout
          const exactMatch = await withTimeout(
            convex.query(api.users.checkEmail, { email: emailToCheck }),
            5000
          );

          if (exactMatch) {
            formData.set("email", emailToCheck);
            console.log("Using exact match email for login");
          } else {
            // Check lowercase match with timeout
            const lowerMatch = await withTimeout(
              convex.query(api.users.checkEmail, { email: normalizedEmail }),
              5000
            );

            if (lowerMatch) {
              formData.set("email", normalizedEmail);
              console.log("Using lowercase email for login");
            } else {
              // Default to lowercase if neither found
              formData.set("email", normalizedEmail);
            }
          }
        } catch (err) {
          console.error("Error checking email existence:", err);
          // Proceed with normalized email on error
          formData.set("email", normalizedEmail);
        }
      } else {
        // For Sign Up, always enforce lowercase
        formData.set("email", normalizedEmail);
      }

      if (passwordFlow === "signUp") {
        // Use the proactive check result if available, otherwise query
        if (existingUser) {
          if (isMounted.current) {
            const msg = "Não é possível criar conta, pois já existe um email cadastrado no sistema.";
            setError(msg);
            toast.error(msg);
            setIsLoading(false);
          }
          return;
        }

        try {
          const emailExists = await withTimeout(
            convex.query(api.users.checkEmail, { email: normalizedEmail }),
            15000
          );
          if (emailExists) {
            if (isMounted.current) {
              const msg = t('auth.emailAlreadyExists');
              setError(msg);
              toast.error(msg);
              setIsLoading(false);
            }
            return;
          }
        } catch (err) {
          console.error("Error checking email:", err);
        }
      }

      console.log("Attempting login with email:", formData.get("email"));

      if (passwordFlow === "signUp") {
        // For sign up: create account first
        await withTimeout(signIn("password", formData), 15000);

        // Note: For invite-based registration, this flow should NOT be used
        // Users with invites should use the /invite page instead

        // Skip email verification for now - just redirect to dashboard
        toast.success(t('auth.accountCreatedSuccess'));
        if (!isNavigating) {
          setIsNavigating(true);
          const redirect = redirectAfterAuth || "/";
          navigate(redirect, { replace: true });
        }
      } else {
        // For sign in: just authenticate
        await withTimeout(signIn("password", formData), 15000);
        toast.success(t('auth.loginSuccess'));
        if (!isNavigating) {
          setIsNavigating(true);
          const redirect = redirectAfterAuth || "/";
          navigate(redirect, { replace: true });
        }
      }
    } catch (error) {
      console.error("Password authentication error:", error);
      if (!isNavigating) {
        const msg = getFriendlyErrorMessage(error, passwordFlow);
        setError(msg);
        toast.error(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    if (isNavigating) return;
    if (!navigator.onLine) {
      const msg = "Você está offline. Verifique sua conexão com a internet.";
      setError(msg);
      toast.error(msg);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      console.log("Attempting anonymous sign in...");
      await withTimeout(signIn("anonymous"), 15000);
      console.log("Anonymous sign in successful");
      toast.success(t('auth.enteringAsGuest'));
      if (!isNavigating) {
        setIsNavigating(true);
        const redirect = redirectAfterAuth || "/";
        navigate(redirect, { replace: true });
      }
    } catch (error) {
      console.error("Guest login error:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      if (!isNavigating) {
        const msg = getFriendlyErrorMessage(error, "signIn");
        setError(msg);
        toast.error(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Prevent rendering if navigating
  if (isNavigating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Auth Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="flex items-center justify-center h-full flex-col w-full max-w-sm">
          <Card className="w-full border-border/50 shadow-xl backdrop-blur-sm bg-card/95">
            {step === "password" ? (
              <>
                <CardHeader className="text-center space-y-1 pb-4">
                  <div className="flex justify-center mb-4">
                    <div className="p-3 rounded-full bg-primary/10 ring-1 ring-primary/20">
                      <img
                        src="./logo.svg"
                        alt="Logo"
                        width={32}
                        height={32}
                        className="w-8 h-8"
                        onClick={() => navigate("/")}
                      />
                    </div>
                  </div>
                  <CardTitle className="text-2xl font-bold tracking-tight">
                    {passwordFlow === "signIn" ? t('auth.welcomeBack') : t('auth.createAccount')}
                  </CardTitle>
                  <CardDescription className="text-base">
                    {passwordFlow === "signIn"
                      ? t('auth.signInDesc')
                      : t('auth.signUpDesc')}
                  </CardDescription>
                </CardHeader>

                <div className="px-6 pb-2">
                  <Tabs value={passwordFlow} onValueChange={(v) => setPasswordFlow(v as "signIn" | "signUp")} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 h-10 p-1 bg-muted/50">
                      <TabsTrigger value="signIn" className="text-xs font-medium transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm">{t('auth.login')}</TabsTrigger>
                      <TabsTrigger value="signUp" className="text-xs font-medium transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm">{t('auth.signUp')}</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                <form onSubmit={handlePasswordSubmit}>
                  <CardContent className="space-y-4 pt-4">
                    <input type="hidden" name="flow" value={passwordFlow} />

                    {passwordFlow === "signUp" && (
                      <div className="space-y-2">
                        <Label htmlFor="signup-name">{t('auth.fullName')}</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signup-name"
                            name="name"
                            type="text"
                            placeholder="John Doe"
                            className="pl-9 h-10"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={isLoading}
                            required
                            autoComplete="name"
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="password-email">{t('auth.email')}</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="password-email"
                          name="email"
                          type="email"
                          placeholder="name@example.com"
                          className="pl-9 h-10"
                          value={passwordEmail}
                          onChange={(e) => setPasswordEmail(e.target.value)}
                          disabled={isLoading}
                          required
                        />
                      </div>
                      {passwordFlow === "signUp" && existingUser && (
                        <Alert variant="destructive" className="mt-2 py-2 bg-destructive/10 border-destructive/20 text-destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="text-xs font-medium">
                            Este email já está cadastrado. Por favor, faça login.
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password-input">
                          {t('auth.password')} {passwordFlow === "signUp" && <span className="text-xs text-muted-foreground">(min. 8 chars, A-Z, 0-9, special)</span>}
                        </Label>
                        {passwordFlow === "signIn" && (
                          <Button
                            variant="link"
                            className="p-0 h-auto text-xs font-normal text-muted-foreground hover:text-primary"
                            type="button"
                            onClick={() => setStep("forgot-password")}
                          >
                            {t('auth.forgotPassword')}
                          </Button>
                        )}
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="password-input"
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

                    {error && (
                      <Alert variant="destructive" className="mt-4 bg-destructive/10 border-destructive/20 text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="font-medium text-xs">{error}</AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                  <CardFooter className="flex-col gap-4 pb-6">
                    <Button
                      type="submit"
                      className="w-full h-10 text-sm font-medium shadow-md hover:shadow-lg transition-all"
                      disabled={isLoading || (passwordFlow === "signUp" && !!existingUser)}
                    >
                      {isLoading ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>{passwordFlow === "signIn" ? t('auth.signingIn') : t('auth.creatingAccount')}</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <span>{passwordFlow === "signIn" ? t('auth.signIn') : t('auth.createAccountButton')}</span>
                          <ArrowRight className="h-4 w-4" />
                        </div>
                      )}
                    </Button>

                    {passwordFlow === "signIn" && (
                      <div className="relative w-full">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-card px-2 text-muted-foreground">{t('auth.or')}</span>
                        </div>
                      </div>
                    )}

                    {passwordFlow === "signIn" && (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full h-10 text-sm"
                        disabled={isLoading}
                        onClick={() => {
                          if (passwordEmail) {
                            handleEmailSubmit(passwordEmail);
                          } else {
                            setError(t('auth.enterEmailForCode'));
                          }
                        }}
                      >
                        <Mail className="mr-2 h-4 w-4" />
                        {t('auth.loginWithEmailCode')}
                      </Button>
                    )}
                  </CardFooter>
                </form>
              </>
            ) : step === "forgot-password" ? (
              <>
                <CardHeader className="text-center space-y-1 pb-6">
                  <div className="flex justify-center mb-4">
                    <div className="p-3 rounded-full bg-primary/10 ring-1 ring-primary/20">
                      <Lock className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl font-bold tracking-tight">{t('auth.resetPassword')}</CardTitle>
                  <CardDescription className="text-base">
                    {t('auth.resetPasswordDesc')}
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleForgotPasswordSubmit}>
                  <CardContent className="space-y-4 pb-6">
                    <div className="space-y-2">
                      <Label htmlFor="reset-email">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="reset-email"
                          name="email"
                          type="email"
                          placeholder="name@example.com"
                          className="pl-9 h-10"
                          defaultValue={passwordEmail}
                          disabled={isLoading}
                          required
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
                  <CardFooter className="flex-col gap-3 pb-8">
                    <Button
                      type="submit"
                      className="w-full h-10 text-sm font-medium shadow-md"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>{t('auth.sending')}</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <span>{t('auth.sendResetCode')}</span>
                          <ArrowRight className="h-4 w-4" />
                        </div>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setStep("password");
                        setError(null);
                      }}
                      disabled={isLoading}
                      className="w-full"
                    >
                      {t('auth.backToLogin')}
                    </Button>
                  </CardFooter>
                </form>
              </>
            ) : typeof step === "object" && "mode" in step && step.mode === "signup-verification" ? (
              <>
                <CardHeader className="text-center space-y-1 pb-6">
                  <div className="flex justify-center mb-4">
                    <div className="p-3 rounded-full bg-primary/10 ring-1 ring-primary/20">
                      <CheckCircle2 className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl font-bold tracking-tight">{t('auth.verifyEmail')}</CardTitle>
                  <CardDescription className="text-base">
                    {t('auth.verifyEmailDesc')} <span className="font-medium text-foreground">{step.email}</span>
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleSignupVerificationSubmit}>
                  <CardContent className="space-y-4 pb-6">
                    <input type="hidden" name="email" value={step.email} />

                    <div className="space-y-2">
                      <Label>{t('auth.verificationCode')}</Label>
                      <div className="flex justify-center py-2">
                        <InputOTP
                          value={otp}
                          onChange={setOtp}
                          maxLength={6}
                          disabled={isLoading}
                        >
                          <InputOTPGroup className="gap-2">
                            {Array.from({ length: 6 }).map((_, index) => (
                              <InputOTPSlot
                                key={index}
                                index={index}
                                className="h-12 w-10 text-lg border rounded-md shadow-sm"
                              />
                            ))}
                          </InputOTPGroup>
                        </InputOTP>
                        <input type="hidden" name="code" value={otp} />
                      </div>
                    </div>

                    {error && (
                      <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="font-medium text-xs">{error}</AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                  <CardFooter className="flex-col gap-3 pb-8">
                    <Button
                      type="submit"
                      className="w-full h-10 text-sm font-medium shadow-md"
                      disabled={isLoading || otp.length !== 6}
                    >
                      {isLoading ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>{t('auth.verifying')}</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <span>Verificar Email</span>
                          <ArrowRight className="h-4 w-4" />
                        </div>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setStep("password");
                        setError(null);
                        setOtp("");
                      }}
                      disabled={isLoading}
                      className="w-full"
                    >
                      Cancelar
                    </Button>
                  </CardFooter>
                </form>
              </>
            ) : typeof step === "object" && "mode" in step && step.mode === "reset-verification" ? (
              <>
                <CardHeader className="text-center space-y-1 pb-6">
                  <div className="flex justify-center mb-4">
                    <div className="p-3 rounded-full bg-primary/10 ring-1 ring-primary/20">
                      <CheckCircle2 className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl font-bold tracking-tight">{t('auth.setNewPassword')}</CardTitle>
                  <CardDescription className="text-base">
                    {t('auth.setNewPasswordDesc')} <span className="font-medium text-foreground">{step.email}</span>
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleResetVerificationSubmit}>
                  <CardContent className="space-y-4 pb-6">
                    <input type="hidden" name="email" value={step.email} />

                    <div className="space-y-2">
                      <Label>{t('auth.verificationCode')}</Label>
                      <div className="flex justify-center py-2">
                        <InputOTP
                          value={otp}
                          onChange={setOtp}
                          maxLength={6}
                          disabled={isLoading}
                        >
                          <InputOTPGroup className="gap-2">
                            {Array.from({ length: 6 }).map((_, index) => (
                              <InputOTPSlot
                                key={index}
                                index={index}
                                className="h-12 w-10 text-lg border rounded-md shadow-sm"
                              />
                            ))}
                          </InputOTPGroup>
                        </InputOTP>
                        <input type="hidden" name="code" value={otp} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="new-password">{t('auth.newPassword')} <span className="text-xs text-muted-foreground">(min. 8 chars, A-Z, 0-9, special)</span></Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="new-password"
                          name="newPassword"
                          type="password"
                          placeholder="New password"
                          className="pl-9 h-10"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
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
                  <CardFooter className="flex-col gap-3 pb-8">
                    <Button
                      type="submit"
                      className="w-full h-10 text-sm font-medium shadow-md"
                      disabled={isLoading || otp.length !== 6 || newPassword.length < 8}
                    >
                      {isLoading ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>{t('auth.resetting')}</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <span>{t('auth.resetPassword')}</span>
                          <ArrowRight className="h-4 w-4" />
                        </div>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setStep("password");
                        setError(null);
                        setOtp("");
                        setNewPassword("");
                      }}
                      disabled={isLoading}
                      className="w-full"
                    >
                      {t('common.cancel')}
                    </Button>
                  </CardFooter>
                </form>
              </>
            ) : typeof step === "object" && "email" in step ? (
              <>
                <CardHeader className="text-center space-y-1 pb-6">
                  <div className="flex justify-center mb-4">
                    <div className="p-3 rounded-full bg-primary/10 ring-1 ring-primary/20">
                      <Mail className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl font-bold tracking-tight">{t('auth.checkYourEmail')}</CardTitle>
                  <CardDescription className="text-base">
                    {t('auth.checkEmailSent')} <br />
                    <span className="font-medium text-foreground">{typeof step === 'object' && 'email' in step ? step.email : ''}</span>
                  </CardDescription>
                </CardHeader>
                <form onSubmit={handleOtpSubmit}>
                  <CardContent className="pb-6">
                    <input type="hidden" name="email" value={typeof step === 'object' && 'email' in step ? step.email : ''} />
                    <input type="hidden" name="code" value={otp} />

                    <div className="flex justify-center py-4">
                      <InputOTP
                        value={otp}
                        onChange={setOtp}
                        maxLength={6}
                        disabled={isLoading}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && otp.length === 6 && !isLoading) {
                            const form = (e.target as HTMLElement).closest("form");
                            if (form) {
                              form.requestSubmit();
                            }
                          }
                        }}
                      >
                        <InputOTPGroup className="gap-2">
                          {Array.from({ length: 6 }).map((_, index) => (
                            <InputOTPSlot
                              key={index}
                              index={index}
                              className="h-12 w-10 text-lg border rounded-md shadow-sm"
                            />
                          ))}
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    {error && (
                      <Alert variant="destructive" className="mt-4 bg-destructive/10 border-destructive/20 text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="font-medium">{error}</AlertDescription>
                      </Alert>
                    )}
                    <p className="text-sm text-muted-foreground text-center mt-6">
                      Didn't receive a code?{" "}
                      <Button
                        variant="link"
                        className="p-0 h-auto font-medium text-primary"
                        onClick={() => setStep("password")}
                      >
                        Try again
                      </Button>
                    </p>
                  </CardContent>
                  <CardFooter className="flex-col gap-3 pb-8">
                    <Button
                      type="submit"
                      className="w-full h-11 text-base font-medium shadow-md"
                      disabled={isLoading || otp.length !== 6}
                    >
                      {isLoading ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>{t('auth.verifying')}</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <span>{t('auth.verifyCode')}</span>
                          <ArrowRight className="h-4 w-4" />
                        </div>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setStep("password")}
                      disabled={isLoading}
                      className="w-full"
                    >
                      {t('auth.useDifferentEmail')}
                    </Button>
                  </CardFooter>
                </form>
              </>
            ) : null}

            <div className="py-4 px-6 text-xs text-center text-muted-foreground bg-muted/50 border-t rounded-b-xl">
              {t('auth.securedBy')}{" "}
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
        </div>
      </div>
    </div>
  );
}

export default function AuthPage(props: AuthProps) {
  return (
    <Suspense>
      <Auth {...props} />
    </Suspense>
  );
}
