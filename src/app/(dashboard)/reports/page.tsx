"use client"

import { useState } from "react"
import { format } from "date-fns"
import {
  Users,
  CalendarCheck,
  CalendarRange,
  User,
  BookOpen,
  Loader2,
  Download,
} from "lucide-react"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { PageHeader } from "@/components/shared/page-header"
import { useCourses, useDivisions } from "@/hooks/use-courses"
import { useStudents } from "@/hooks/use-students"
import { useActiveAcademicYear } from "@/hooks/use-academic-years"
import { useAuth } from "@/contexts/auth-context"
import { cn } from "@/lib/utils"

interface ReportType {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  requires: ("division" | "student" | "dateRange" | "course")[]
}

const REPORT_TYPES: ReportType[] = [
  {
    id: "student_list",
    title: "Lista de Alumnos",
    description: "Listado completo de estudiantes por división",
    icon: <Users className="size-6" />,
    requires: ["division"],
  },
  {
    id: "daily_attendance",
    title: "Asistencia Diaria",
    description: "Reporte de asistencia del día",
    icon: <CalendarCheck className="size-6" />,
    requires: ["division", "dateRange"],
  },
  {
    id: "monthly_attendance",
    title: "Asistencia Mensual",
    description: "Resumen de asistencia mensual",
    icon: <CalendarRange className="size-6" />,
    requires: ["division", "dateRange"],
  },
  {
    id: "student_history",
    title: "Historial del Alumno",
    description: "Historial completo de un estudiante",
    icon: <User className="size-6" />,
    requires: ["student"],
  },
  {
    id: "preceptor_book",
    title: "Libro del Preceptor",
    description: "Registro completo del libro del preceptor",
    icon: <BookOpen className="size-6" />,
    requires: ["dateRange"],
  },
]

export default function ReportsPage() {
  const { school } = useAuth()
  const [selectedReport, setSelectedReport] = useState<string | null>(null)
  const [courseId, setCourseId] = useState("")
  const [divisionId, setDivisionId] = useState("")
  const [studentId, setStudentId] = useState("")
  const today = format(new Date(), "yyyy-MM-dd")
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [isGenerating, setIsGenerating] = useState(false)

  const { data: activeAcademicYear } = useActiveAcademicYear()
  const { data: courses } = useCourses(activeAcademicYear?.id)
  const { data: divisions } = useDivisions(courseId)
  const { data: students } = useStudents(divisionId)

  const report = REPORT_TYPES.find((r) => r.id === selectedReport)

  const selectedCourseName = courses?.find((c) => c.id === courseId)?.name
  const selectedDivisionName = divisions?.find((d) => d.id === divisionId)?.name

  function selectReport(reportId: string) {
    setSelectedReport(reportId)
    setCourseId("")
    setDivisionId("")
    setStudentId("")
    setStartDate(today)
    setEndDate(today)
  }

  const handleGenerate = async () => {
    if (!selectedReport) return
    setIsGenerating(true)

    try {
      const doc = new jsPDF("p", "mm", "a4")
      const pageWidth = doc.internal.pageSize.getWidth()

      doc.setFontSize(16)
      doc.text(school?.name || "Institución", pageWidth / 2, 20, {
        align: "center",
      })
      doc.setFontSize(10)
      doc.text(
        `Reporte: ${REPORT_TYPES.find((r) => r.id === selectedReport)?.title || selectedReport}`,
        pageWidth / 2,
        28,
        { align: "center" }
      )
      doc.setFontSize(8)
      doc.text(`Generado: ${new Date().toLocaleDateString("es-AR")}`, pageWidth / 2, 34, {
        align: "center",
      })
      doc.line(14, 38, pageWidth - 14, 38)

      let yPos = 44

      if (courseId || divisionId) {
        doc.setFontSize(9)
        const infoParts: string[] = []
        if (selectedCourseName) infoParts.push(`Curso: ${selectedCourseName}`)
        if (selectedDivisionName) infoParts.push(`División: ${selectedDivisionName}`)
        if (infoParts.length > 0) {
          doc.text(infoParts.join(" · "), 14, yPos)
          yPos += 6
        }
      }

      switch (selectedReport) {
        case "student_list": {
          if (!divisionId) {
            doc.setFontSize(10)
            doc.text("Seleccioná una división para generar el reporte.", 14, yPos)
          } else {
            const studentData = students || []
            if (studentData.length === 0) {
              doc.setFontSize(10)
              doc.text("No hay estudiantes en la división seleccionada.", 14, yPos)
            } else {
              autoTable(doc, {
                startY: yPos,
                head: [["Apellido", "Nombre", "DNI", "Estado"]],
                body: studentData.map((s) => [
                  s.last_name,
                  s.first_name,
                  s.dni,
                  s.status === "active" ? "Activo" : "Inactivo",
                ]),
                styles: { fontSize: 8 },
                headStyles: { fillColor: [59, 130, 246] },
              })
            }
          }
          break
        }
        case "daily_attendance": {
          if (!divisionId) {
            doc.setFontSize(10)
            doc.text("Seleccioná una división para generar el reporte.", 14, yPos)
          } else {
            const supabase = (await import("@/lib/supabase/client")).createClient()
            const { data: attendanceRecords } = await supabase
              .from("attendance")
              .select("*, students(first_name, last_name, dni)")
              .eq("division_id", divisionId)
              .eq("school_id", school!.id)
              .gte("date", startDate || today)
              .lte("date", endDate || today)
              .order("date", { ascending: true })
              .order("students(last_name)", { ascending: true })

            const records = attendanceRecords ?? []
            if (records.length === 0) {
              doc.setFontSize(10)
              doc.text("No hay registros de asistencia en el período seleccionado.", 14, yPos)
            } else {
              doc.setFontSize(10)
              doc.text(
                `Rango de fechas: ${startDate || today} a ${endDate || today}`,
                14,
                yPos
              )
              yPos += 8
              autoTable(doc, {
                startY: yPos,
                head: [["Fecha", "Alumno", "DNI", "Estado"]],
                body: records.map((r) => [
                  format(new Date(r.date), "dd/MM/yyyy"),
                  `${r.students?.last_name ?? ""}, ${r.students?.first_name ?? ""}`,
                  r.students?.dni ?? "",
                  r.status === "present" ? "Presente"
                    : r.status === "absent" ? "Ausente"
                    : r.status === "absent_justified" ? "Ausente Justif."
                    : r.status === "late" ? "Tarde"
                    : r.status === "early_withdrawal" ? "Retiro Anticipado"
                    : r.status,
                ]),
                styles: { fontSize: 8 },
                headStyles: { fillColor: [59, 130, 246] },
              })
            }
          }
          break
        }
        case "monthly_attendance": {
          if (!divisionId) {
            doc.setFontSize(10)
            doc.text("Seleccioná una división para generar el reporte.", 14, yPos)
          } else {
            const supabase = (await import("@/lib/supabase/client")).createClient()
            const { data: attendanceRecords } = await supabase
              .from("attendance")
              .select("date, status")
              .eq("division_id", divisionId)
              .eq("school_id", school!.id)
              .gte("date", startDate || today)
              .lte("date", endDate || today)
              .order("date", { ascending: true })

            const records = attendanceRecords ?? []
            if (records.length === 0) {
              doc.setFontSize(10)
              doc.text("No hay registros de asistencia en el período seleccionado.", 14, yPos)
            } else {
              doc.setFontSize(10)
              doc.text(
                `Rango de fechas: ${startDate || today} a ${endDate || today}`,
                14,
                yPos
              )
              yPos += 8

              const summaryMap = new Map<string, { present: number; absent: number; absent_justified: number; late: number; early_withdrawal: number }>()
              for (const r of records) {
                if (!summaryMap.has(r.date)) {
                  summaryMap.set(r.date, { present: 0, absent: 0, absent_justified: 0, late: 0, early_withdrawal: 0 })
                }
                const day = summaryMap.get(r.date)!
                if (r.status === "present") day.present++
                else if (r.status === "absent") day.absent++
                else if (r.status === "absent_justified") day.absent_justified++
                else if (r.status === "late") day.late++
                else if (r.status === "early_withdrawal") day.early_withdrawal++
              }

              autoTable(doc, {
                startY: yPos,
                head: [["Fecha", "Presentes", "Ausentes", "Justif.", "Tardes", "Retiro Ant."]],
                body: Array.from(summaryMap.entries()).map(([date, counts]) => [
                  format(new Date(date), "dd/MM/yyyy"),
                  counts.present,
                  counts.absent,
                  counts.absent_justified,
                  counts.late,
                  counts.early_withdrawal,
                ]),
                styles: { fontSize: 8 },
                headStyles: { fillColor: [59, 130, 246] },
              })
            }
          }
          break
        }
        case "student_history": {
          const selectedStudent = studentId
            ? students?.find((s) => s.id === studentId)
            : null
          doc.setFontSize(10)
          doc.text(
            `Estudiante: ${selectedStudent ? `${selectedStudent.last_name}, ${selectedStudent.first_name}` : "No seleccionado"}`,
            14,
            yPos
          )
          yPos += 8
          autoTable(doc, {
            startY: yPos,
            head: [["Tipo", "Detalle", "Fecha"]],
            body: [["—", "Seleccione un estudiante para ver su historial", "—"]],
            styles: { fontSize: 8 },
            headStyles: { fillColor: [59, 130, 246] },
          })
          break
        }
        case "preceptor_book": {
          doc.setFontSize(10)
          doc.text(
            `Rango de fechas: ${startDate || "—"} a ${endDate || "—"}`,
            14,
            yPos
          )
          yPos += 8
          autoTable(doc, {
            startY: yPos,
            head: [["Tipo", "Título", "Descripción", "Fecha"]],
            body: [["—", "—", "—", "—"]],
            styles: { fontSize: 8 },
            headStyles: { fillColor: [59, 130, 246] },
          })
          break
        }
      }

      yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || yPos
      yPos += 10
      doc.setFontSize(7)
      doc.text(
        `Preceptor - Sistema de Gestión Escolar · ${new Date().toLocaleString("es-AR")}`,
        pageWidth / 2,
        yPos + 10,
        { align: "center" }
      )

      doc.save(`reporte_${selectedReport}_${Date.now()}.pdf`)
    } catch (err) {
      console.error("Error generating PDF:", err)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Reportes" description="Generación de reportes escolares en PDF" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORT_TYPES.map((reportType) => (
          <Card
            key={reportType.id}
            className={cn(
              "cursor-pointer transition-all hover:border-primary/50 hover:shadow-sm",
              selectedReport === reportType.id && "border-primary ring-1 ring-primary"
            )}
            onClick={() => selectReport(reportType.id)}
          >
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  {reportType.icon}
                </div>
              </div>
              <CardTitle className="text-sm mt-2">{reportType.title}</CardTitle>
              <CardDescription>{reportType.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      {report && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Parámetros: {report.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {report.requires.includes("division") && (
                <>
                  <div className="space-y-2">
                    <Label>Curso</Label>
                    <Select value={courseId} onValueChange={(v) => { setCourseId(v ?? ""); setDivisionId("") }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar curso" />
                      </SelectTrigger>
                      <SelectContent>
                        {courses?.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>División</Label>
                    <Select
                      value={divisionId}
                      onValueChange={(v) => setDivisionId(v ?? "")}
                      disabled={!courseId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar división" />
                      </SelectTrigger>
                      <SelectContent>
                        {divisions?.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
              {report.requires.includes("student") && (
                <div className="space-y-2">
                  <Label>Estudiante</Label>
                  <Select value={studentId} onValueChange={(v) => setStudentId(v ?? "")}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar estudiante" />
                    </SelectTrigger>
                    <SelectContent>
                      {students?.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.last_name}, {s.first_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {report.requires.includes("dateRange") && (
                <>
                  <div className="space-y-2">
                    <Label>Fecha desde</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha hasta</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>

            <Button
              className="mt-6"
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Download className="size-4" />
                  Generar PDF
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
