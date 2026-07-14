"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm, Controller, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useCreateStudent } from "@/hooks/use-students"
import { useCourses } from "@/hooks/use-courses"
import { useAuth } from "@/contexts/auth-context"
import { PageHeader } from "@/components/shared/page-header"
import { LoadingScreen } from "@/components/shared/loading-screen"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs"
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Loader2,
  User,
  BookOpen,
  MapPin,
  Heart,
  Users,
  ShieldCheck,
} from "lucide-react"
import {
  SEX_OPTIONS,
  BLOOD_TYPE_OPTIONS,
  RELATIONSHIP_OPTIONS,
} from "@/lib/constants"
import type { DivisionWithCourse } from "@/types/database"

const guardianSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  relationship: z.string().min(1, "El parentesco es requerido"),
})

const authorizedPersonSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  phone: z.string().nullable().optional(),
  document: z.string().nullable().optional(),
})

const studentFormSchema = z.object({
  first_name: z.string().min(1, "El nombre es requerido"),
  last_name: z.string().min(1, "El apellido es requerido"),
  dni: z.string().min(1, "El DNI es requerido"),
  birth_date: z.string().nullable().optional(),
  gender: z.string().nullable().optional(),
  nationality: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  blood_type: z.string().nullable().optional(),
  health_insurance: z.string().nullable().optional(),
  health_affiliate_number: z.string().nullable().optional(),
  doctor_name: z.string().nullable().optional(),
  doctor_phone: z.string().nullable().optional(),
  allergies: z.string().nullable().optional(),
  medication: z.string().nullable().optional(),
  restrictions: z.string().nullable().optional(),
  division_id: z.string().nullable().optional(),
  academic_year_id: z.string().nullable().optional(),
  guardians: z.array(guardianSchema),
  authorized_persons: z.array(authorizedPersonSchema),
})

type StudentFormValues = z.infer<typeof studentFormSchema>

export default function NewStudentPage() {
  const router = useRouter()
  const { school } = useAuth()
  const createStudent = useCreateStudent()
  const { data: courses, isLoading: coursesLoading } = useCourses()
  const [courseId, setCourseId] = useState<string>("")
  const [divisions, setDivisions] = useState<DivisionWithCourse[]>([])
  const [loadingDivisions, setLoadingDivisions] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
  } = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      dni: "",
      birth_date: "",
      gender: "",
      nationality: "",
      address: "",
      phone: "",
      email: "",
      blood_type: "",
      health_insurance: "",
      health_affiliate_number: "",
      doctor_name: "",
      doctor_phone: "",
      allergies: "",
      medication: "",
      restrictions: "",
      division_id: "",
      academic_year_id: "",
      guardians: [],
      authorized_persons: [],
    },
  })

  const {
    fields: guardianFields,
    append: appendGuardian,
    remove: removeGuardian,
  } = useFieldArray({ control, name: "guardians" })

  const {
    fields: authPersonFields,
    append: appendAuthPerson,
    remove: removeAuthPerson,
  } = useFieldArray({ control, name: "authorized_persons" })

  const handleCourseChange = async (value: string | null) => {
    const v = value ?? ""
    setCourseId(v)
    setValue("division_id", "")
    if (!v) {
      setDivisions([])
      return
    }
    setLoadingDivisions(true)
    try {
      const { getDivisions } = await import("@/services/courses")
      const result = await getDivisions(v)
      setDivisions(result)
    } catch {
      setDivisions([])
    } finally {
      setLoadingDivisions(false)
    }
  }

  const onSubmit = async (formData: StudentFormValues) => {
    const payload = {
      firstName: formData.first_name,
      lastName: formData.last_name,
      dni: formData.dni,
      birthDate: formData.birth_date || null,
      gender: formData.gender || null,
      nationality: formData.nationality || null,
      address: formData.address || null,
      phone: formData.phone || null,
      email: formData.email || null,
      bloodType: formData.blood_type || null,
      healthInsurance: formData.health_insurance || null,
      healthAffiliateNumber: formData.health_affiliate_number || null,
      doctorName: formData.doctor_name || null,
      doctorPhone: formData.doctor_phone || null,
      allergies: formData.allergies || null,
      medication: formData.medication || null,
      restrictions: formData.restrictions || null,
      divisionId: formData.division_id || null,
      academicYearId: formData.academic_year_id || null,
      schoolId: school?.id ?? "",
      status: "active",
      guardians: formData.guardians.filter((g) => g.name),
      authorizedPersons: formData.authorized_persons.filter((p) => p.name),
    }
    createStudent.mutate(payload as any, {
      onSuccess: () => router.push("/students"),
    })
  }

  if (coursesLoading) return <LoadingScreen />

  return (
    <div className="space-y-6">
      <PageHeader title="Nuevo Alumno" description="Completa los datos del alumno">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="size-4" />
          Volver
        </Button>
      </PageHeader>

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Curso</Label>
          <Select value={courseId} onValueChange={handleCourseChange}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar curso..." />
            </SelectTrigger>
            <SelectContent>
              {(courses ?? []).length === 0 && (
                <div className="px-2 py-4 text-center text-xs text-muted-foreground">
                  No hay cursos disponibles
                </div>
              )}
              {(courses ?? []).map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>División</Label>
          <Controller
            name="division_id"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value ?? ""}
                onValueChange={field.onChange}
                disabled={!courseId || loadingDivisions}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      !courseId
                        ? "Primero seleccione un curso"
                        : loadingDivisions
                          ? "Cargando..."
                          : "Seleccionar división..."
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {divisions.map((div) => (
                    <SelectItem key={div.id} value={div.id}>
                      {div.name} {div.shift ? `- ${div.shift}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="personal">
              <User className="size-4" />
              Datos Personales
            </TabsTrigger>
            <TabsTrigger value="contact">
              <MapPin className="size-4" />
              Contacto
            </TabsTrigger>
            <TabsTrigger value="medical">
              <Heart className="size-4" />
              Médica
            </TabsTrigger>
            <TabsTrigger value="guardians">
              <Users className="size-4" />
              Responsables
            </TabsTrigger>
            <TabsTrigger value="authorized">
              <ShieldCheck className="size-4" />
              Autorizados
            </TabsTrigger>
          </TabsList>

          <TabsContent value="personal" className="mt-4 space-y-4">
            <Card>
              <CardContent className="grid gap-4 pt-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="first_name">
                    Nombre <span className="text-destructive">*</span>
                  </Label>
                  <Input id="first_name" {...register("first_name")} />
                  {errors.first_name && (
                    <p className="text-xs text-destructive">
                      {errors.first_name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">
                    Apellido <span className="text-destructive">*</span>
                  </Label>
                  <Input id="last_name" {...register("last_name")} />
                  {errors.last_name && (
                    <p className="text-xs text-destructive">
                      {errors.last_name.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dni">
                    DNI <span className="text-destructive">*</span>
                  </Label>
                  <Input id="dni" {...register("dni")} />
                  {errors.dni && (
                    <p className="text-xs text-destructive">
                      {errors.dni.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="birth_date">Fecha de Nacimiento</Label>
                  <Input id="birth_date" type="date" {...register("birth_date")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Sexo</Label>
                  <Controller
                    name="gender"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value ?? ""} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                        <SelectContent>
                          {SEX_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nationality">Nacionalidad</Label>
                  <Input id="nationality" {...register("nationality")} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="contact" className="mt-4 space-y-4">
            <Card>
              <CardContent className="grid gap-4 pt-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="address">Domicilio</Label>
                  <Input id="address" {...register("address")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input id="phone" {...register("phone")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" {...register("email")} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="medical" className="mt-4 space-y-4">
            <Card>
              <CardContent className="grid gap-4 pt-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="blood_type">Grupo Sanguíneo</Label>
                  <Controller
                    name="blood_type"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value ?? ""} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar..." />
                        </SelectTrigger>
                        <SelectContent>
                          {BLOOD_TYPE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="health_insurance">Obra Social</Label>
                  <Input id="health_insurance" {...register("health_insurance")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="health_affiliate_number">N° de Afiliado</Label>
                  <Input
                    id="health_affiliate_number"
                    {...register("health_affiliate_number")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doctor_name">Médico de Cabecera</Label>
                  <Input id="doctor_name" {...register("doctor_name")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doctor_phone">Tel. del Médico</Label>
                  <Input id="doctor_phone" {...register("doctor_phone")} />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="grid gap-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="allergies">Alergias</Label>
                  <Textarea id="allergies" {...register("allergies")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="medication">Medicación</Label>
                  <Textarea id="medication" {...register("medication")} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="restrictions">Restricciones</Label>
                  <Textarea id="restrictions" {...register("restrictions")} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="guardians" className="mt-4 space-y-4">
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-4">
                  {guardianFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="rounded-lg border p-4 relative"
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="absolute top-2 right-2"
                        onClick={() => removeGuardian(index)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>
                            Nombre <span className="text-destructive">*</span>
                          </Label>
                          <Input {...register(`guardians.${index}.name`)} />
                          {errors.guardians?.[index]?.name && (
                            <p className="text-xs text-destructive">
                              {errors.guardians[index]?.name?.message}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label>Parentesco <span className="text-destructive">*</span></Label>
                          <Controller
                            name={`guardians.${index}.relationship`}
                            control={control}
                            render={({ field }) => (
                              <Select
                                value={field.value ?? ""}
                                onValueChange={field.onChange}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {RELATIONSHIP_OPTIONS.map((opt) => (
                                    <SelectItem key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                          {errors.guardians?.[index]?.relationship && (
                            <p className="text-xs text-destructive">
                              {errors.guardians[index]?.relationship?.message}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label>Teléfono</Label>
                          <Input {...register(`guardians.${index}.phone`)} />
                        </div>
                        <div className="space-y-2">
                          <Label>Email</Label>
                          <Input
                            type="email"
                            {...register(`guardians.${index}.email`)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      appendGuardian({
                        name: "",
                        phone: "",
                        email: "",
                        relationship: "",
                      })
                    }
                  >
                    <Plus className="size-4" />
                    Agregar Responsable
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="authorized" className="mt-4 space-y-4">
            <Card>
              <CardContent className="pt-4">
                <div className="space-y-4">
                  {authPersonFields.map((field, index) => (
                    <div
                      key={field.id}
                      className="rounded-lg border p-4 relative"
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        className="absolute top-2 right-2"
                        onClick={() => removeAuthPerson(index)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                      <div className="grid gap-4 sm:grid-cols-3">
                        <div className="space-y-2">
                          <Label>
                            Nombre <span className="text-destructive">*</span>
                          </Label>
                          <Input {...register(`authorized_persons.${index}.name`)} />
                          {errors.authorized_persons?.[index]?.name && (
                            <p className="text-xs text-destructive">
                              {errors.authorized_persons[index]?.name?.message}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label>Teléfono</Label>
                          <Input
                            {...register(`authorized_persons.${index}.phone`)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Documento</Label>
                          <Input
                            {...register(`authorized_persons.${index}.document`)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      appendAuthPerson({
                        name: "",
                        phone: "",
                        document: "",
                      })
                    }
                  >
                    <Plus className="size-4" />
                    Agregar Persona Autorizada
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mt-6 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting || createStudent.isPending}>
            {createStudent.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {createStudent.isPending ? "Guardando..." : "Guardar Alumno"}
          </Button>
        </div>
      </form>
    </div>
  )
}
