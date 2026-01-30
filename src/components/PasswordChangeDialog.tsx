import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { KeyRound, Loader2 } from "lucide-react";

type Step = "request" | "verify";

export function PasswordChangeDialog() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const requestPasswordChange = useMutation(api.users.requestPasswordChange);
  const notifyPasswordReset = useMutation(api.users.notifyPasswordResetSuccess);
  const { signIn } = useAuthActions();

  const handleReset = () => {
    setStep("request");
    setCode("");
    setNewPassword("");
    setIsLoading(false);
  };

  const handleClose = () => {
    setOpen(false);
    setTimeout(handleReset, 200);
  };

  const handleRequestChange = async () => {
    if (!navigator.onLine) {
      toast.error("Você está offline. Verifique sua conexão com a internet.");
      return;
    }

    setIsLoading(true);
    try {
      const result = await requestPasswordChange();
      setEmail(result.email);

      // Trigger password reset flow
      const formData = new FormData();
      formData.append("email", result.email);
      formData.append("flow", "reset");

      await signIn("password", formData);

      toast.success("Código de verificação enviado para seu email!");
      setStep("verify");
    } catch (error: any) {
      console.error("Error requesting password change:", error);
      toast.error(error.message || "Erro ao solicitar mudança de senha");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAndChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (code.length !== 6) {
      toast.error("Por favor, insira o código de 6 dígitos");
      return;
    }

    if (newPassword.length < 8) {
      toast.error("A senha deve ter pelo menos 8 caracteres");
      return;
    }

    if (!navigator.onLine) {
      toast.error("Você está offline. Verifique sua conexão com a internet.");
      return;
    }

    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("email", email);
      formData.append("code", code);
      formData.append("password", newPassword);
      formData.append("flow", "reset-verification");

      await signIn("password", formData);

      // Notify user about successful password change
      await notifyPasswordReset();

      toast.success("Senha alterada com sucesso!");
      handleClose();
    } catch (error: any) {
      console.error("Error changing password:", error);
      toast.error(error.message || "Código inválido ou expirado");
      setCode("");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          <KeyRound className="mr-2 h-4 w-4" />
          Alterar Senha
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Alterar Senha</DialogTitle>
          <DialogDescription>
            Digite sua nova senha abaixo para atualizar suas credenciais de acesso.
          </DialogDescription>
        </DialogHeader>

        {step === "request" ? (
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Clique no botão abaixo para receber um código de verificação no seu email.
            </p>
            <Button
              onClick={handleRequestChange}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                "Enviar Código de Verificação"
              )}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleVerifyAndChange} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Código de Verificação</Label>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={code}
                  onChange={setCode}
                  disabled={isLoading}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Código enviado para {email}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova Senha</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Mínimo 8 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isLoading}
                required
                minLength={8}
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={isLoading}
                className="flex-1"
              >
                Voltar
              </Button>
              <Button
                type="submit"
                disabled={isLoading || code.length !== 6 || newPassword.length < 8}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Alterando...
                  </>
                ) : (
                  "Alterar Senha"
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
