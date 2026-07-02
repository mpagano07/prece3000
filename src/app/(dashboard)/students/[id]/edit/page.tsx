"use client"

import { use, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm, Controller, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  useStudent,
  useUpdateStudent,
} from "@/hooks/use-students"
import { useCourses } from "@/hooks/use-courses"
import { LoadingScreen } from "@/components/shared/loading-screen"
import { EmptyState } from "@/components/shared/empty-state"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
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
import { createClient } from "@/lib/supabase/client"
import { StudentService } from "@/services/students"
import { useQuery } from "@tanstack/react-query"
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
import type { DivisionWithCourse, Student } from "@/types/database"

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

interface PageProps {
  params: Promise<{ id: string }>
}

export default function EditStudentPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const updateStudent = useUpdateStudent()
  const { data: student, isLoading: studentLoading, error } = useStudent(id)
  const { data: courses, isLoading: coursesLoading } = useCourses()
  const [courseId, setCourseId] = useState<string>("")
  const [divisions, setDivisions] = useState<DivisionWithCourse[]>([])
  const [loadingDivisions, setLoadingDivisions] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    reset,
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

  const supabase = createClient()

  const { data: existingGuardians } = useQuery({
    queryKey: ["student-guardians", id],
    queryFn: () => StudentService.getGuardians(supabase, id),
    enabled: !!id,
  })

  const { data: existingAuthorized } = useQuery({
    queryKey: ["student-authorized", id],
    queryFn: () => StudentService.getAuthorizedPersons(supabase, id),
    enabled: !!id,
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

  useEffect(() => {
    if (student && existingGuardians && existingAuthorized) {
      reset({
        first_name: student.first_name ?? "",
        last_name: student.last_name ?? "",
        dni: student.dni ?? "",
        birth_date: student.birth_date ?? "",
        gender: student.gender ?? "",
        nationality: student.nationality ?? "",
        address: student.address ?? "",
        phone: student.phone ?? "",
        email: student.email ?? "",
        blood_type: student.blood_type ?? "",
        health_insurance: student.health_insurance ?? "",
        health_affiliate_number: student.health_affiliate_number ?? "",
        doctor_name: student.doctor_name ?? "",
        doctor_phone: student.doctor_phone ?? "",
        allergies: student.allergies ?? "",
        medication: student.medication ?? "",
        restrictions: student.restrictions ?? "",
        division_id: student.division_id ?? "",
        academic_year_id: student.academic_year_id ?? "",
        guardians: existingGuardians.map((g) => ({
          name: g.name,
          phone: g.phone ?? "",
          email: g.email ?? "",
          relationship: g.relationship,
        })),
        authorized_persons: existingAuthorized.map((p) => ({
          name: p.name,
          phone: p.phone ?? "",
          document: p.document ?? "",
        })),
      })
    }
  }, [student, existingGuardians, existingAuthorized, reset])

  const handleCourseChange = async (value: string | null) => {
    const v = value ?? ""
    setCourseId(v)
    if (!v) {
      setDivisions([])
      return
    }
    setLoadingDivisions(true)
    try {
      const { courseService } = await import("@/services/courses")
      const result = await courseService.getDivisions(v)
      const matching = result.find((d) => d.id === student?.division_id)
      if (matching) {
        setValue("division_id", matching.id)
      } else {
        setValue("division_id", "")
      }
      setDivisions(result)
    } catch {
      setDivisions([])
    } finally {
      setLoadingDivisions(false)
    }
  }

  const onSubmit = async (formData: StudentFormValues) => {
    const payload: Record<string, unknown> = {
      first_name: formData.first_name,
      last_name: formData.last_name,
      dni: formData.dni,
      birth_date: formData.birth_date || null,
      gender: formData.gender || null,
      nationality: formData.nationality || null,
      address: formData.address || null,
      phone: formData.phone || null,
      email: formData.email || null,
      blood_type: formData.blood_type || null,
      health_insurance: formData.health_insurance || null,
      health_affiliate_number: formData.health_affiliate_number || null,
      doctor_name: formData.doctor_name || null,
      doctor_phone: formData.doctor_phone || null,
      allergies: formData.allergies || null,
      medication: formData.medication || null,
      restrictions: formData.restrictions || null,
      division_id: formData.division_id || null,
      academic_year_id: formData.academic_year_id || null,
      guardians: formData.guardians.filter((g) => g.name),
      authorized_persons: formData.authorized_persons.filter((p) => p.name),
    }

    updateStudent.mutate(
      { id, data: payload },
      { onSuccess: () => router.push(`/students/${id}`) }
    )
  }

  if (studentLoading || coursesLoading) return <LoadingScreen />

  if (error || !student) {
    return (
      <div className="space-y-6">
        <PageHeader title="Alumno no encontrado">
          <Button variant="outline" onClick={() => router.push("/students")}>
            <ArrowLeft className="size-4" />
            Volver
          </Button>
        </PageHeader>
        <EmptyState
          icon={<User className="size-12" />}
          title="Alumno no encontrado"
          description="El alumno solicitado no existe o ha sido eliminado"
          action={{
            label: "Ver todos los alumnos",
            onClick: () => router.push("/students"),
          }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Editar Alumno"
        description={`Editando datos de ${student.last_name}, ${student.first_name}`}
      >
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="size-4" />
          Volver
        </Button>
      </PageHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <Tabs defaultValue="personal" className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="personal">
              <User className="size-4" />
              Datos Personales
            </TabsTrigger>
            <TabsTrigger value="school">
              <BookOpen className="size-4" />
              Escolar
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
                  <Input
                    id="birth_date"
                    type="date"
                    {...register("birth_date")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Sexo</Label>
                  <Controller
                    name="gender"
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

          <TabsContent value="school" className="mt-4 space-y-4">
            <Card>
              <CardContent className="grid gap-4 pt-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="course">Curso</Label>
                  <Select value={courseId} onValueChange={handleCourseChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar curso..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(courses ?? []).map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="division_id">División</Label>
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
                              loadingDivisions
                                ? "Cargando..."
                                : "Seleccionar división..."
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {divisions.map((div) => (
                            <SelectItem key={div.id} value={div.id}>
                              {div.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
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
                  <Input
                    id="email"
                    type="email"
                    {...register("email")}
                  />
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
                      <Select
                        value={field.value ?? ""}
                        onValueChange={field.onChange}
                      >
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
                  <Input
                    id="health_insurance"
                    {...register("health_insurance")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="health_affiliate_number">
                    N° de Afiliado
                  </Label>
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
                          <Label>
                            Parentesco{" "}
                            <span className="text-destructive">*</span>
                          </Label>
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
                                    <SelectItem
                                      key={opt.value}
                                      value={opt.value}
                                    >
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
                          <Input
                            {...register(`guardians.${index}.phone`)}
                          />
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
                          <Input
                            {...register(
                              `authorized_persons.${index}.name`
                            )}
                          />
                          {errors.authorized_persons?.[index]?.name && (
                            <p className="text-xs text-destructive">
                              {errors.authorized_persons[index]?.name?.message}
                            </p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label>Teléfono</Label>
                          <Input
                            {...register(
                              `authorized_persons.${index}.phone`
                            )}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Documento</Label>
                          <Input
                            {...register(
                              `authorized_persons.${index}.document`
                            )}
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
          <Button type="submit" disabled={isSubmitting || updateStudent.isPending}>
            {updateStudent.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {updateStudent.isPending ? "Guardando..." : "Guardar Cambios"}
          </Button>
        </div>
      </form>
    </div>
  )
}
