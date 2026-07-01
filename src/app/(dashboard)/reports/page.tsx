"use client"

import { useState, useRef } from "react"
import {
  FileDown,
  FileText,
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
import { useAuth } from "@/contexts/auth-context"
import { formatDate } from "@/lib/utils"
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
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const previewRef = useRef<HTMLIFrameElement>(null)

  const { data: courses } = useCourses()
  const { data: divisions } = useDivisions(courseId)
  const { data: students } = useStudents(divisionId)

  const report = REPORT_TYPES.find((r) => r.id === selectedReport)

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

      switch (selectedReport) {
        case "student_list": {
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
          break
        }
        case "daily_attendance":
        case "monthly_attendance": {
          doc.setFontSize(10)
          doc.text(
            `Rango de fechas: ${startDate || "—"} a ${endDate || "—"}`,
            14,
            yPos
          )
          doc.setFontSize(9)
          doc.text(
            "Los datos de asistencia se generarán desde el sistema.",
            14,
            yPos + 7
          )
          yPos += 14
          autoTable(doc, {
            startY: yPos,
            head: [["Fecha", "Presentes", "Ausentes", "Justificados", "Tardes"]],
            body: [
              ["—", "—", "—", "—", "—"],
              ["—", "—", "—", "—", "—"],
            ],
            styles: { fontSize: 8 },
            headStyles: { fillColor: [59, 130, 246] },
          })
          break
        }
        case "student_history": {
          doc.setFontSize(10)
          doc.text(
            `Estudiante ID: ${studentId || "No seleccionado"}`,
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

      yPos = (doc as any).lastAutoTable?.finalY || yPos
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
            onClick={() => setSelectedReport(reportType.id)}
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
                    <Select value={courseId} onValueChange={(v) => setCourseId(v ?? "")}>
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
