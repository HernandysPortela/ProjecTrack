import { useState, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/contexts/LanguageContext";
import { Download, Upload, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2, X } from "lucide-react";
import * as XLSX from "xlsx";

interface ExcelImportProps {
  projectId: Id<"projects">;
  onSuccess?: () => void;
}

interface TaskRow {
  titulo: string;
  descricao?: string;
  status?: string;
  prioridade?: string;
  dataInicio?: string;
  dataFim?: string;
  responsavel?: string;
  tarefaPai?: string;
  progresso?: number;
  estimativaHoras?: number;
  tags?: string;
}

export function ExcelImport({ projectId, onSuccess }: ExcelImportProps) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<TaskRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const createTask = useMutation(api.tasks.create);

  // Gerar template Excel para download
  const downloadTemplate = () => {
    const template = [
      {
        titulo: "Exemplo de Tarefa",
        descricao: "Descrição detalhada da tarefa",
        status: "todo",
        prioridade: "medium",
        dataInicio: "2026-02-15",
        dataFim: "2026-02-20",
        responsavel: "email@exemplo.com",
        tarefaPai: "",
        progresso: 0,
        estimativaHoras: 8,
        tags: "desenvolvimento,backend"
      },
      {
        titulo: "Subtarefa Exemplo",
        descricao: "Esta é uma subtarefa",
        status: "in_progress",
        prioridade: "high",
        dataInicio: "2026-02-15",
        dataFim: "2026-02-17",
        responsavel: "email@exemplo.com",
        tarefaPai: "Exemplo de Tarefa",
        progresso: 50,
        estimativaHoras: 4,
        tags: "frontend"
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    
    // Definir largura das colunas
    ws['!cols'] = [
      { wch: 30 }, // titulo
      { wch: 50 }, // descricao
      { wch: 15 }, // status
      { wch: 15 }, // prioridade
      { wch: 15 }, // dataInicio
      { wch: 15 }, // dataFim
      { wch: 25 }, // responsavel
      { wch: 30 }, // tarefaPai
      { wch: 10 }, // progresso
      { wch: 15 }, // estimativaHoras
      { wch: 30 }  // tags
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tarefas");

    // Adicionar uma aba com instruções
    const instructions = [
      { campo: "titulo", obrigatorio: "SIM", descricao: "Nome da tarefa", exemplo: "Implementar login" },
      { campo: "descricao", obrigatorio: "NÃO", descricao: "Descrição detalhada", exemplo: "Criar tela de login com autenticação" },
      { campo: "status", obrigatorio: "NÃO", descricao: "Status da tarefa", exemplo: "todo, in_progress, review, done, blocked" },
      { campo: "prioridade", obrigatorio: "NÃO", descricao: "Prioridade", exemplo: "low, medium, high, urgent" },
      { campo: "dataInicio", obrigatorio: "NÃO", descricao: "Data de início", exemplo: "2026-02-15" },
      { campo: "dataFim", obrigatorio: "NÃO", descricao: "Data de término", exemplo: "2026-02-20" },
      { campo: "responsavel", obrigatorio: "NÃO", descricao: "Email do responsável", exemplo: "usuario@email.com" },
      { campo: "tarefaPai", obrigatorio: "NÃO", descricao: "Título da tarefa pai (para subtarefas)", exemplo: "Tarefa Principal" },
      { campo: "progresso", obrigatorio: "NÃO", descricao: "Progresso (0-100)", exemplo: "50" },
      { campo: "estimativaHoras", obrigatorio: "NÃO", descricao: "Estimativa em horas", exemplo: "8" },
      { campo: "tags", obrigatorio: "NÃO", descricao: "Tags separadas por vírgula", exemplo: "backend,api,urgente" }
    ];

    const wsInstructions = XLSX.utils.json_to_sheet(instructions);
    wsInstructions['!cols'] = [
      { wch: 20 },
      { wch: 15 },
      { wch: 40 },
      { wch: 40 }
    ];
    XLSX.utils.book_append_sheet(wb, wsInstructions, "Instruções");

    XLSX.writeFile(wb, "template_importacao_tarefas.xlsx");
  };

  // Processar arquivo Excel
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);
    setParsedData([]);

    try {
      const data = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as TaskRow[];

      if (jsonData.length === 0) {
        setError("O arquivo Excel está vazio ou não contém dados válidos.");
        return;
      }

      // Validar dados
      const invalidRows = jsonData.filter((row, index) => {
        if (!row.titulo || row.titulo.toString().trim() === "") {
          return true;
        }
        return false;
      });

      if (invalidRows.length > 0) {
        setError(`${invalidRows.length} linha(s) sem título. O campo "titulo" é obrigatório.`);
        return;
      }

      setParsedData(jsonData);
    } catch (err) {
      console.error("Erro ao processar Excel:", err);
      setError("Erro ao processar o arquivo. Verifique se é um arquivo Excel válido.");
    }
  };

  // Processar importação
  const handleImport = async () => {
    if (parsedData.length === 0) return;

    setIsProcessing(true);
    setProgress(0);
    setImportedCount(0);
    setError(null);

    try {
      // Mapear títulos para IDs das tarefas criadas
      const taskMap = new Map<string, Id<"tasks">>();

      // Primeira passagem: criar tarefas sem parentTaskId
      for (let i = 0; i < parsedData.length; i++) {
        const row = parsedData[i];
        
        // Pular se tiver tarefaPai (será criada na segunda passagem)
        if (row.tarefaPai && row.tarefaPai.toString().trim() !== "") {
          continue;
        }

        try {
          const taskData: any = {
            projectId,
            title: row.titulo.toString().trim(),
            priority: row.prioridade ? row.prioridade.toString().toLowerCase() : "medium",
          };

          if (row.descricao) taskData.description = row.descricao.toString();
          if (row.status) taskData.status = row.status.toString().toLowerCase();
          if (row.dataInicio) taskData.startDate = new Date(row.dataInicio.toString()).getTime();
          if (row.dataFim) taskData.dueDate = new Date(row.dataFim.toString()).getTime();
          if (row.progresso !== undefined) taskData.progress = Number(row.progresso);
          if (row.estimativaHoras !== undefined) taskData.estimatedHours = Number(row.estimativaHoras);

          const taskId = await createTask(taskData);
          taskMap.set(row.titulo.toString().trim(), taskId);
          
          console.log(`✅ Tarefa criada: "${row.titulo}" (ID: ${taskId})`);
          
          setImportedCount(prev => prev + 1);
          setProgress(((i + 1) / parsedData.length) * 50);
        } catch (err) {
          console.error(`❌ Erro ao criar tarefa "${row.titulo}":`, err);
        }
      }

      // Segunda passagem: criar subtarefas
      for (let i = 0; i < parsedData.length; i++) {
        const row = parsedData[i];
        
        // Pular se não tiver tarefaPai
        if (!row.tarefaPai || row.tarefaPai.toString().trim() === "") {
          continue;
        }

        try {
          const parentTitle = row.tarefaPai.toString().trim();
          const parentTaskId = taskMap.get(parentTitle);

          if (!parentTaskId) {
            console.warn(`Tarefa pai "${parentTitle}" não encontrada para "${row.titulo}"`);
            continue;
          }

          const taskData: any = {
            projectId,
            title: row.titulo.toString().trim(),
            parentTaskId,
            priority: row.prioridade ? row.prioridade.toString().toLowerCase() : "medium",
          };

          if (row.descricao) taskData.description = row.descricao.toString();
          if (row.status) taskData.status = row.status.toString().toLowerCase();
          if (row.dataInicio) taskData.startDate = new Date(row.dataInicio.toString()).getTime();
          if (row.dataFim) taskData.dueDate = new Date(row.dataFim.toString()).getTime();
          if (row.progresso !== undefined) taskData.progress = Number(row.progresso);
          if (row.estimativaHoras !== undefined) taskData.estimatedHours = Number(row.estimativaHoras);

          const taskId = await createTask(taskData);
          
          console.log(`✅ Subtarefa criada: "${row.titulo}" → "${parentTitle}" (ID: ${taskId})`);
          
          setImportedCount(prev => prev + 1);
          setProgress(50 + ((i + 1) / parsedData.length) * 50);
        } catch (err) {
          console.error(`❌ Erro ao criar subtarefa "${row.titulo}":`, err);
        }
      }

      setProgress(100);
      
      console.log(`📊 Importação concluída! ${importedCount} tarefas importadas com sucesso.`);
      
      // Aguardar um pouco para mostrar o sucesso
      setTimeout(() => {
        setIsOpen(false);
        resetState();
        onSuccess?.();
      }, 1500);

    } catch (err) {
      console.error("Erro na importação:", err);
      setError("Erro ao importar tarefas. Tente novamente.");
    } finally {
      setIsProcessing(false);
    }
  };

  const resetState = () => {
    setFile(null);
    setParsedData([]);
    setProgress(0);
    setImportedCount(0);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="hover:bg-muted/80 hover:border-primary/40 transition-all duration-200"
      >
        <FileSpreadsheet className="h-4 w-4 mr-2" />
        {t('excel.import')}
      </Button>

      <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open && !isProcessing) {
          resetState();
        }
        setIsOpen(open);
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              {t('excel.importTasks')}
            </DialogTitle>
            <DialogDescription>
              {t('excel.importDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Download Template */}
            <div className="border rounded-lg p-4 bg-muted/50">
              <div className="flex items-start gap-3">
                <Download className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium mb-1">{t('excel.downloadTemplate')}</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    {t('excel.templateDescription')}
                  </p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={downloadTemplate}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    {t('excel.download')}
                  </Button>
                </div>
              </div>
            </div>

            {/* Upload File */}
            <div className="border rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Upload className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium mb-1">{t('excel.uploadFile')}</h4>
                  <p className="text-sm text-muted-foreground mb-3">
                    {t('excel.uploadDescription')}
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    disabled={isProcessing}
                    className="hidden"
                    id="excel-upload"
                  />
                  <label htmlFor="excel-upload">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={isProcessing}
                      onClick={() => fileInputRef.current?.click()}
                      className="gap-2"
                      asChild
                    >
                      <span>
                        <Upload className="h-4 w-4" />
                        {file ? file.name : t('excel.selectFile')}
                      </span>
                    </Button>
                  </label>
                </div>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Preview */}
            {parsedData.length > 0 && !isProcessing && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  {parsedData.length} {t('excel.tasksFound')}
                </AlertDescription>
              </Alert>
            )}

            {/* Progress */}
            {isProcessing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>{t('excel.importing')}</span>
                  <span className="text-muted-foreground">{importedCount} / {parsedData.length}</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsOpen(false);
                resetState();
              }}
              disabled={isProcessing}
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleImport}
              disabled={parsedData.length === 0 || isProcessing}
              className="gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('excel.importing')}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  {t('excel.import')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
