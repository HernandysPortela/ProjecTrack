import { useState, useEffect } from "react";
import { useQuery, useMutation, usePaginatedQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Building2, ChevronDown, Lock } from "lucide-react";
import { Id } from "@convex/_generated/dataModel";
import { useLanguage } from "@/contexts/LanguageContext";

type CompanyFormDraft = {
  companyName: string;
  cnpj: string;
  cep: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
};

export default function CompanySection() {
  const { t } = useLanguage();
  const user = useQuery(api.users.currentUser);
  const company = useQuery(api.companies.getCompany);
  const createCompany = useMutation(api.companies.createCompany);
  const updateCompany = useMutation(api.companies.updateCompany);

  const { results: companiesList, status: companiesStatus, loadMore: loadMoreCompanies } = usePaginatedQuery(
    api.companies.getCompanies,
    {},
    { initialNumItems: 5 }
  );

  // Debug info
  const debugInfo = useQuery(api.companies.debugCompanyStatus);
  useEffect(() => {
    if (debugInfo) {
      console.log("Debug Company Status:", debugInfo);
    }
  }, [debugInfo]);

  // Tab state
  const [companyTab, setCompanyTab] = useState<"register" | "departments" | "list">("register");

  // State for company form
  const [companyName, setCompanyName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [isCompanyInitialized, setIsCompanyInitialized] = useState(false);
  const companyFormStorageKey = user?._id ? `companyForm:${user._id}` : null;

  const applyCompanyFormState = (values: CompanyFormDraft) => {
    setCompanyName(values.companyName);
    setCnpj(values.cnpj);
    setCep(values.cep);
    setStreet(values.street);
    setNumber(values.number);
    setNeighborhood(values.neighborhood);
    setCity(values.city);
    setState(values.state);
  };

  const clearCompanyDraft = () => {
    if (!companyFormStorageKey || typeof window === "undefined") {
      return;
    }
    window.localStorage.removeItem(companyFormStorageKey);
  };

  const isAdmin = user?.role === "owner" || user?.role === "manager";

  // Effect to populate form if company exists
  useEffect(() => {
    console.log("CompanySection company data:", company);
    if (company === undefined || !companyFormStorageKey || isCompanyInitialized) {
      return;
    }

    const baseValues: CompanyFormDraft = {
      companyName: company?.name ?? "",
      cnpj: company?.cnpj ?? "",
      cep: company?.address?.zip ?? "",
      street: company?.address?.street ?? "",
      number: company?.address?.number ?? "",
      neighborhood: company?.address?.neighborhood ?? "",
      city: company?.address?.city ?? "",
      state: company?.address?.state ?? "",
    };

    let nextValues = baseValues;

    if (typeof window !== "undefined") {
      try {
        const cached = window.localStorage.getItem(companyFormStorageKey);
        if (cached) {
          nextValues = {
            ...nextValues,
            ...(JSON.parse(cached) as Partial<CompanyFormDraft>),
          };
        }
      } catch (error) {
        console.error("Erro ao restaurar rascunho da empresa:", error);
      }
    }

    applyCompanyFormState(nextValues);
    setIsCompanyInitialized(true);
  }, [company, companyFormStorageKey, isCompanyInitialized]);

  useEffect(() => {
    if (!companyFormStorageKey || !isCompanyInitialized) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const payload: CompanyFormDraft = {
      companyName,
      cnpj,
      cep,
      street,
      number,
      neighborhood,
      city,
      state,
    };

    try {
      window.localStorage.setItem(companyFormStorageKey, JSON.stringify(payload));
    } catch (error) {
      console.error("Não foi possível salvar o rascunho da empresa:", error);
    }
  }, [companyName, cnpj, cep, street, number, neighborhood, city, state, companyFormStorageKey, isCompanyInitialized]);

  const handleCepBlur = async () => {
    if (cep.length === 8) {
      setIsLoadingCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setStreet(data.logradouro);
          setNeighborhood(data.bairro);
          setCity(data.localidade);
          setState(data.uf);
        } else {
          toast.error(t('messages.error.generic'));
        }
      } catch (error) {
        toast.error(t('messages.error.generic'));
      } finally {
        setIsLoadingCep(false);
      }
    }
  };

  const handleSaveCompany = async () => {
    if (company === undefined) return;
    if (!isAdmin) {
      toast.error(t('company.readOnlyMode'));
      return;
    }

    try {
      const address = { street, number, neighborhood, city, state, zip: cep };
      if (company) {
        await updateCompany({
          id: company._id,
          name: companyName,
          cnpj,
          address,
        });
        toast.success(t('company.companyUpdated'));
      } else {
        await createCompany({
          name: companyName,
          cnpj,
          address,
        });
        toast.success(t('company.companyCreated'));
      }
      clearCompanyDraft();
    } catch (error) {
      const msg = error instanceof Error ? error.message : t('messages.error.generic');
      toast.error(`${t('profile.companySaveError')}: ${msg}`);
      console.error(error);
    }
  };

  const isLoading = company === undefined || user === undefined;

  return (
    <div className="w-full space-y-6">
      {!isAdmin && !isLoading && (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-md border border-blue-200 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-200 flex items-center gap-2">
          <Lock className="h-4 w-4" />
          <p>{t('company.readOnlyMode')}</p>
        </div>
      )}

      {!company && !isLoading && isAdmin && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-md border border-yellow-200 dark:border-yellow-800 text-sm text-yellow-800 dark:text-yellow-200">
          <p className="font-medium">{t('company.noCompanyFound')}</p>
          <p>{t('company.noCompanyFoundDesc')} <a href="#" className="underline">{t('company.profile')}</a>.</p>
        </div>
      )}

      <Tabs value={companyTab} onValueChange={(value) => setCompanyTab(value as "register" | "departments" | "list")}>
        <TabsList>
          <TabsTrigger value="register">{t('company.registerCompany')}</TabsTrigger>
          <TabsTrigger value="departments">{t('company.departments')}</TabsTrigger>
          <TabsTrigger value="list">{t('company.companiesRegistered')}</TabsTrigger>
        </TabsList>

        <TabsContent value="register" className="mt-6">
          <div className="grid gap-6 grid-cols-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  {t('company.companyData')}
                </CardTitle>
                <CardDescription>{t('company.companyDataDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-2">
                  <Label htmlFor="name">{t('company.companyName')}</Label>
                  <Input
                    id="name"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder={t('company.companyNamePlaceholder')}
                    disabled={!isAdmin}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="cnpj">{t('company.cnpj')}</Label>
                  <Input
                    id="cnpj"
                    value={cnpj}
                    onChange={(e) => setCnpj(e.target.value)}
                    placeholder={t('company.cnpjPlaceholder')}
                    disabled={!isAdmin}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="cep">{t('company.cep')}</Label>
                    <div className="relative">
                      <Input
                        id="cep"
                        value={cep}
                        onChange={(e) => setCep(e.target.value.replace(/\D/g, ""))}
                        onBlur={handleCepBlur}
                        placeholder={t('company.cepPlaceholder')}
                        maxLength={8}
                        disabled={!isAdmin}
                      />
                      {isLoadingCep && (
                        <div className="absolute right-3 top-2.5">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="number">{t('company.number')}</Label>
                    <Input
                      id="number"
                      value={number}
                      onChange={(e) => setNumber(e.target.value)}
                      placeholder={t('company.numberPlaceholder')}
                      disabled={!isAdmin}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="street">{t('company.street')}</Label>
                  <Input
                    id="street"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    placeholder={t('company.streetPlaceholder')}
                    disabled={!isAdmin}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="neighborhood">{t('company.neighborhood')}</Label>
                    <Input
                      id="neighborhood"
                      value={neighborhood}
                      onChange={(e) => setNeighborhood(e.target.value)}
                      placeholder={t('company.neighborhoodPlaceholder')}
                      disabled={!isAdmin}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="city">{t('company.city')}</Label>
                    <Input
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder={t('company.cityPlaceholder')}
                      disabled={!isAdmin}
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="state">{t('company.state')}</Label>
                  <Input
                    id="state"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder={t('company.statePlaceholder')}
                    maxLength={2}
                    disabled={!isAdmin}
                  />
                </div>
                {isAdmin && (
                  <Button onClick={handleSaveCompany} className="w-full" disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (company ? t('company.updateData') : t('company.registerCompany'))}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="departments" className="mt-6">
          {company ? (
            <DepartmentsCard companyId={company._id} isAdmin={isAdmin} />
          ) : (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">
                  {t('company.noDepartmentsWithoutCompany')}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="list" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('company.companiesRegistered')}</CardTitle>
              <CardDescription>{t('company.companiesRegisteredDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('company.name')}</TableHead>
                      <TableHead>{t('company.cnpj')}</TableHead>
                      <TableHead>{t('company.cityUf')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companiesList?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-4">
                          {t('company.noCompaniesYet')}
                        </TableCell>
                      </TableRow>
                    )}
                    {companiesList?.map((c) => (
                      <TableRow key={c._id}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell>{c.cnpj}</TableCell>
                        <TableCell>{c.address.city}/{c.address.state}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {companiesStatus === "CanLoadMore" && (
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="outline"
                    onClick={() => loadMoreCompanies(5)}
                  >
                    {t('company.loadMore')}
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DepartmentsCard({ companyId, isAdmin }: { companyId: Id<"companies">, isAdmin: boolean }) {
  const { t } = useLanguage();
  const departments = useQuery(api.companies.getDepartments, { companyId });
  const createDepartment = useMutation(api.companies.createDepartment);
  const deleteDepartment = useMutation(api.companies.deleteDepartment);

  const [deptName, setDeptName] = useState("");
  const [deptDesc, setDeptDesc] = useState("");

  const handleAddDepartment = async () => {
    if (!isAdmin) return;
    if (!deptName.trim()) {
      toast.error(t('company.deptNameRequired'));
      return;
    }

    try {
      await createDepartment({
        name: deptName,
        description: deptDesc,
        companyId,
      });
      setDeptName("");
      setDeptDesc("");
      toast.success(t('company.deptAdded'));
    } catch (error) {
      const msg = error instanceof Error ? error.message : t('messages.error.generic');
      if (msg.includes("Department already exists")) {
        toast.error(t('company.deptAlreadyExists'));
      } else if (msg.includes("Department name cannot be empty")) {
        toast.error(t('company.deptEmptyName'));
      } else {
        toast.error(t('company.deptAddError'));
      }
    }
  };

  const handleDeleteDepartment = async (id: Id<"departments">) => {
    if (!isAdmin) return;
    try {
      await deleteDepartment({ id });
      toast.success(t('company.deptRemoved'));
    } catch (error) {
      const msg = error instanceof Error ? error.message : t('company.deptRemoveError');
      toast.error(msg);
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>{t('company.departments')}</CardTitle>
        <CardDescription>{t('company.deptDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-6">
        {isAdmin && (
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="grid gap-2 flex-1 w-full">
              <Label htmlFor="deptName">{t('company.deptName')}</Label>
              <Input
                id="deptName"
                value={deptName}
                onChange={(e) => setDeptName(e.target.value)}
                placeholder={t('company.addDeptPlaceholder')}
              />
            </div>
            <div className="grid gap-2 flex-1 w-full">
              <Label htmlFor="deptDesc">{t('company.deptDesc')}</Label>
              <Input
                id="deptDesc"
                value={deptDesc}
                onChange={(e) => setDeptDesc(e.target.value)}
                placeholder={t('company.deptDescPlaceholder')}
              />
            </div>
            <Button onClick={handleAddDepartment}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}

        <div className="border rounded-md flex-1 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('company.name')}</TableHead>
                <TableHead>{t('company.description')}</TableHead>
                {isAdmin && <TableHead className="w-[50px]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {departments?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 3 : 2} className="text-center text-muted-foreground">
                    {t('company.noDepartmentsFound')}
                  </TableCell>
                </TableRow>
              )}
              {departments?.map((dept) => (
                <TableRow key={dept._id}>
                  <TableCell>{dept.name}</TableCell>
                  <TableCell>{dept.description || "-"}</TableCell>
                  {isAdmin && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteDepartment(dept._id)}
                        className="text-destructive hover:text-destructive/90"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
