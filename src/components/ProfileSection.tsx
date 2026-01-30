import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Loader2, Upload, User } from "lucide-react";
import { Id } from "@convex/_generated/dataModel";
import { ImageCropDialog } from "./ImageCropDialog";
import { useLanguage } from "@/contexts/LanguageContext";

export function ProfileSection() {
  const { t } = useLanguage();
  const user = useQuery(api.users.currentUser);
  const updateProfile = useMutation(api.users.updateProfile);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);
  const companies = useQuery(api.companies.getAllCompanies);

  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevUserRef = useRef<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    company: "",
    phone: "",
    department: "",
    companyId: "" as string,
    departmentId: "" as string,
  });

  const departments = useQuery(
    api.companies.getDepartments,
    formData.companyId ? { companyId: formData.companyId as Id<"companies"> } : "skip"
  );

  const storageKey = user?._id ? `profileForm:${user._id}` : null;

  useEffect(() => {
    if (user === undefined) {
      return;
    }

    if (user === null) {
      if (storageKey && typeof window !== "undefined") {
        window.localStorage.removeItem(storageKey);
      }
      setIsInitialized(false);
      prevUserRef.current = null;
      setFormData({
        name: "",
        company: "",
        phone: "",
        department: "",
        companyId: "",
        departmentId: "",
      });
      return;
    }

    const nextFormValues = {
      name: user.name || "",
      company: user.company || "",
      phone: user.phone || "",
      department: user.department || "",
      companyId: (user.companyId ?? "") as string,
      departmentId: (user.departmentId ?? "") as string,
    };

    console.log("ProfileSection useEffect - user data from DB:", {
      companyId: user.companyId,
      company: user.company,
      departmentId: user.departmentId,
      department: user.department,
      isInitialized
    });

    if (!isInitialized) {
      let initialValues = { ...nextFormValues };

      if (storageKey && typeof window !== "undefined") {
        try {
          const cachedData = window.localStorage.getItem(storageKey);
          console.log("ProfileSection: localStorage data:", cachedData);
          if (cachedData) {
            const parsedDraft = JSON.parse(cachedData);
            console.log("ProfileSection: parsed localStorage:", parsedDraft);
            const allowedDraftFields: Array<keyof typeof formData> = ["name", "phone"];
            const filteredDraft = allowedDraftFields.reduce((acc, field) => {
              if (parsedDraft[field]) {
                acc[field] = parsedDraft[field];
              }
              return acc;
            }, {} as Partial<typeof formData>);
            console.log("ProfileSection: filtered draft:", filteredDraft);
            initialValues = {
              ...initialValues,
              ...filteredDraft,
            };
          }
        } catch (error) {
          console.error("Erro ao restaurar rascunho do perfil:", error);
        }
      }

      // Always use company/department from database (not localStorage)
      initialValues.companyId = nextFormValues.companyId;
      initialValues.company = nextFormValues.company;
      initialValues.departmentId = nextFormValues.departmentId;
      initialValues.department = nextFormValues.department;

      console.log("ProfileSection: Initializing form with values:", initialValues);
      setFormData(initialValues);
      setIsInitialized(true);
      prevUserRef.current = user;
      return;
    }

    const prevUser = prevUserRef.current;
    if (!prevUser) {
      prevUserRef.current = user;
      return;
    }

    const prevFormValues = {
      name: prevUser.name || "",
      company: prevUser.company || "",
      phone: prevUser.phone || "",
      department: prevUser.department || "",
      companyId: (prevUser.companyId ?? "") as string,
      departmentId: (prevUser.departmentId ?? "") as string,
    };

    const hasChanges = (Object.keys(nextFormValues) as Array<
      keyof typeof nextFormValues
    >).some((key) => prevFormValues[key] !== nextFormValues[key]);

    if (hasChanges) {
      console.log("ProfileSection: User data changed, updating form", {
        prevFormValues,
        nextFormValues,
        changes: Object.keys(nextFormValues).filter(key => prevFormValues[key as keyof typeof nextFormValues] !== nextFormValues[key as keyof typeof nextFormValues])
      });
      setFormData(nextFormValues);
    }

    prevUserRef.current = user;
  }, [user, isInitialized]);

  useEffect(() => {
    if (!user || !isInitialized) {
      return;
    }

    setFormData((prev) => {
      let hasChanges = false;
      const nextState = { ...prev };

      // Update companyId if it changed from the backend
      if (user.companyId && prev.companyId !== user.companyId) {
        nextState.companyId = user.companyId as string;
        nextState.company = user.company || "";
        hasChanges = true;
      }

      // Update departmentId if it changed from the backend
      if (user.departmentId && prev.departmentId !== user.departmentId) {
        nextState.departmentId = user.departmentId as string;
        nextState.department = user.department || "";
        hasChanges = true;
      }

      return hasChanges ? nextState : prev;
    });
  }, [user?.companyId, user?.departmentId, user?.company, user?.department, isInitialized]);

  useEffect(() => {
    if (!storageKey || !isInitialized) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    try {
      const storagePayload: Partial<typeof formData> = {};
      const allowedDraftFields: Array<keyof typeof formData> = ["name", "phone"];

      allowedDraftFields.forEach((field) => {
        const value = formData[field];
        if (value) {
          storagePayload[field] = value;
        }
      });

      if (Object.keys(storagePayload).length === 0) {
        window.localStorage.removeItem(storageKey);
      } else {
        window.localStorage.setItem(storageKey, JSON.stringify(storagePayload));
      }
    } catch (error) {
      console.error("Não foi possível salvar o rascunho do perfil:", error);
    }
  }, [formData, storageKey, isInitialized]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCompanyChange = async (value: string) => {
    // Don't save if value is empty
    if (!value) {
      console.log("Company value is empty, skipping save");
      return;
    }

    const selectedCompany = companies?.find(c => c._id === value);

    // Update local state immediately for UI feedback
    setFormData(prev => ({
      ...prev,
      companyId: value,
      company: selectedCompany?.name || "",
      departmentId: "",
      department: ""
    }));

    // Save to database immediately
    try {
      await updateProfile({
        companyId: value as Id<"companies">,
        company: selectedCompany?.name || "",
      });
      console.log("Company saved successfully");
      toast.success(t('profile.companySaved'));
    } catch (error) {
      console.error("Error saving company:", error);
      toast.error(t('profile.companySaveError'));
    }
  };

  const handleDepartmentChange = async (value: string) => {
    // Don't save if value is empty
    if (!value) {
      console.log("Department value is empty, skipping save");
      return;
    }

    const selectedDepartment = departments?.find(d => d._id === value);

    // Update local state immediately for UI feedback
    setFormData(prev => ({
      ...prev,
      departmentId: value,
      department: selectedDepartment?.name || ""
    }));

    // Save to database immediately
    try {
      await updateProfile({
        departmentId: value as Id<"departments">,
        department: selectedDepartment?.name || "",
      });
      console.log("Department saved successfully");
      toast.success(t('profile.departmentSaved'));
    } catch (error) {
      console.error("Error saving department:", error);
      toast.error(t('profile.departmentSaveError'));
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setImageToCrop(reader.result as string);
      setCropDialogOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = async (croppedImage: Blob) => {
    setIsUploading(true);
    setUploadProgress(0);
    try {
      const postUrl = await generateUploadUrl();
      console.log("Upload URL generated:", postUrl);

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", postUrl);
        xhr.setRequestHeader("Content-Type", "image/jpeg");

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = (event.loaded / event.total) * 100;
            setUploadProgress(percentComplete);
          }
        };

        xhr.onload = async () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const { storageId } = JSON.parse(xhr.responseText);
              console.log("Image uploaded with storageId:", storageId);

              await updateProfile({ imageId: storageId });
              console.log("Profile updated with imageId:", storageId);

              toast.success(t('profile.photoUpdated'));
              resolve();
            } catch (err) {
              reject(err);
            }
          } else {
            reject(new Error(`Upload failed: ${xhr.statusText}`));
          }
        };

        xhr.onerror = () => reject(new Error("Network error during upload"));

        xhr.send(croppedImage);
      });

    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error(t('profile.photoUpdateError'));
    } finally {
      setIsUploading(false);
      setImageToCrop(null);
      setCropDialogOpen(false);
      setUploadProgress(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updateData: any = {
        name: formData.name,
        phone: formData.phone,
      };

      // Only send companyId and departmentId (not the string names)
      if (formData.companyId) {
        updateData.companyId = formData.companyId as Id<"companies">;
        updateData.company = formData.company; // Also update the name for backward compatibility
      }

      if (formData.departmentId) {
        updateData.departmentId = formData.departmentId as Id<"departments">;
        updateData.department = formData.department; // Also update the name for backward compatibility
      }

      console.log("Submitting profile update:", updateData);
      // Explicitly do NOT include imageId here to avoid overwriting it
      await updateProfile(updateData);

      if (storageKey && typeof window !== "undefined") {
        window.localStorage.removeItem(storageKey);
      }

      // Update prevUserRef to prevent form from being reset
      if (prevUserRef.current) {
        prevUserRef.current = {
          ...prevUserRef.current,
          name: formData.name,
          phone: formData.phone,
          company: formData.company,
          department: formData.department,
          companyId: formData.companyId,
          departmentId: formData.departmentId,
        };
        console.log("ProfileSection: Updated prevUserRef after save:", prevUserRef.current);
      } else {
        console.log("ProfileSection: prevUserRef.current is null, cannot update");
      }

      toast.success(t('profile.saveChanges') + ' ✓');
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error(t('profile.saveChanges') + ' ✗');
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="w-full p-6 space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{t('profile.title')}</h2>
        <p className="text-muted-foreground">
          {t('profile.subtitle')}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('profile.personalInfo')}</CardTitle>
          <CardDescription>
            {t('profile.personalInfoDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-6">
            <Avatar className="h-24 w-24 border-2 border-border">
              <AvatarImage
                key={user.imageUrl}
                src={user.imageUrl ?? undefined}
                alt={user.name || "User"}
                onError={(e) => console.error("Avatar image failed to load:", user.imageUrl)}
              />
              <AvatarFallback className="text-2xl">
                {user.name?.charAt(0).toUpperCase() || <User />}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  {t('profile.changePhoto')}
                </Button>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageSelect}
                />
              </div>
              {isUploading ? (
                <div className="space-y-1 pt-2">
                  <Progress value={uploadProgress} className="h-2 w-full" />
                  <p className="text-xs text-muted-foreground text-center">
                    {t('profile.uploadingImage')} {Math.round(uploadProgress)}%
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  JPG, GIF ou PNG. {t('profile.maxFileSize')}.
                </p>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('profile.fullName')}</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Seu nome"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t('profile.email')}</Label>
                <Input
                  id="email"
                  value={user.email}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">{t('profile.company')}</Label>
                <Select
                  value={formData.companyId}
                  onValueChange={handleCompanyChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('profile.selectCompany')} />
                  </SelectTrigger>
                  <SelectContent>
                    {companies?.map((company) => (
                      <SelectItem key={company._id} value={company._id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">{t('profile.department')}</Label>
                <Select
                  value={formData.departmentId}
                  onValueChange={handleDepartmentChange}
                  disabled={!formData.companyId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t('profile.selectDepartment')} />
                  </SelectTrigger>
                  <SelectContent>
                    {departments?.map((dept) => (
                      <SelectItem key={dept._id} value={dept._id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t('profile.phone')}</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSaving ? t('profile.saving') : t('profile.saveChanges')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>


      {imageToCrop && (
        <ImageCropDialog
          open={cropDialogOpen}
          onClose={() => {
            setCropDialogOpen(false);
            setImageToCrop(null);
          }}
          imageSrc={imageToCrop}
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  );
}
