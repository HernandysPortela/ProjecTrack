import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  X,
  Search,
  User,
  Tag,
  AlertCircle,
  CheckCircle2,
  ListFilter
} from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";

export interface ProjectFiltersState {
  search: string;
  status: string | "all";
  priority: string | "all";
  assigneeId: string | "all";
  tagId: string | "all";
  tagIds?: string[];
}

interface ProjectFiltersProps {
  filters: ProjectFiltersState;
  setFilters: (filters: ProjectFiltersState) => void;
  members: any[];
  tags: any[];
}

export function ProjectFilters({
  filters,
  setFilters,
  members,
  tags,
}: ProjectFiltersProps) {
  const handleReset = () => {
    setFilters({
      search: "",
      status: "all",
      priority: "all",
      assigneeId: "all",
      tagId: "all",
      tagIds: [],
    });
  };

  const hasActiveFilters =
    filters.search !== "" ||
    filters.status !== "all" ||
    filters.priority !== "all" ||
    filters.assigneeId !== "all" ||
    filters.tagId !== "all" ||
    (filters.tagIds && filters.tagIds.length > 0);

  const selectedTagIds = filters.tagIds || [];

  const toggleTag = (tagId: string) => {
    const currentTags = filters.tagIds || [];
    const newTags = currentTags.includes(tagId)
      ? currentTags.filter(id => id !== tagId)
      : [...currentTags, tagId];

    setFilters({ ...filters, tagIds: newTags, tagId: "all" });
  };

  const removeTag = (tagId: string) => {
    const newTags = (filters.tagIds || []).filter(id => id !== tagId);
    setFilters({ ...filters, tagIds: newTags });
  };

  return (
    <div className="bg-card rounded-xl border shadow-sm px-6 py-4 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-foreground">
          <ListFilter className="h-5 w-5" />
          <h3 className="font-semibold text-base">Filtros</h3>
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-8 px-2 text-muted-foreground hover:text-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          >
            <X className="h-4 w-4 mr-2" />
            Limpar filtros
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-6 items-start">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome..."
            value={filters.search}
            onChange={(e) =>
              setFilters({ ...filters, search: e.target.value })
            }
            className="pl-9 bg-background"
          />
        </div>

        <Select
          value={filters.status}
          onValueChange={(value) =>
            setFilters({ ...filters, status: value })
          }
        >
          <SelectTrigger className={`min-w-[160px] h-12 whitespace-normal ${filters.status !== 'all' ? 'bg-primary/5 border-primary/20 text-primary' : 'bg-background'}`}>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 opacity-50" />
              <SelectValue placeholder="Status" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Status</SelectItem>
            <SelectItem value="todo">A Fazer</SelectItem>
            <SelectItem value="in_progress">Em Progresso</SelectItem>
            <SelectItem value="review">Revisão</SelectItem>
            <SelectItem value="done">Concluído</SelectItem>
            <SelectItem value="blocked">Bloqueado</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.priority}
          onValueChange={(value) =>
            setFilters({ ...filters, priority: value })
          }
        >
          <SelectTrigger className={`min-w-[160px] h-12 whitespace-normal ${filters.priority !== 'all' ? 'bg-primary/5 border-primary/20 text-primary' : 'bg-background'}`}>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 opacity-50" />
              <SelectValue placeholder="Prioridade" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Prioridades</SelectItem>
            <SelectItem value="low">Baixa</SelectItem>
            <SelectItem value="medium">Média</SelectItem>
            <SelectItem value="high">Alta</SelectItem>
            <SelectItem value="urgent">Urgente</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.assigneeId}
          onValueChange={(value) =>
            setFilters({ ...filters, assigneeId: value })
          }
        >
          <SelectTrigger className={`min-w-[160px] h-12 whitespace-normal ${filters.assigneeId !== 'all' ? 'bg-primary/5 border-primary/20 text-primary' : 'bg-background'}`}>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 opacity-50" />
              <SelectValue placeholder="Responsável" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Responsáveis</SelectItem>
            {members.map((member) => (
              <SelectItem key={member._id} value={member._id}>
                {member.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.tagId}
          onValueChange={(value) => {
            if (value !== "all") {
              toggleTag(value);
            }
          }}
        >
          <SelectTrigger className={`min-w-[160px] h-12 whitespace-normal ${selectedTagIds.length > 0 ? 'bg-primary/5 border-primary/20 text-primary' : 'bg-background'}`}>
            <div className="flex items-center gap-2">
              <Tag className="h-4 w-4 opacity-50" />
              <SelectValue placeholder={selectedTagIds.length > 0 ? `${selectedTagIds.length} tag(s)` : "Tags"} />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Selecionar Tags</SelectItem>
            {tags.map((tag) => (
              <SelectItem key={tag._id} value={tag._id}>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedTagIds.includes(tag._id)}
                    onChange={() => {}}
                    className="h-4 w-4"
                  />
                  {tag.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Selected Tags Display */}
      {selectedTagIds.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
          <span className="text-sm text-muted-foreground">Tags selecionadas:</span>
          {selectedTagIds.map((tagId) => {
            const tag = tags.find(t => t._id === tagId);
            if (!tag) return null;
            return (
              <Badge
                key={tagId}
                variant="secondary"
                className="flex items-center gap-1 cursor-pointer hover:bg-destructive/10"
                onClick={() => removeTag(tagId)}
              >
                {tag.name}
                <X className="h-3 w-3" />
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}