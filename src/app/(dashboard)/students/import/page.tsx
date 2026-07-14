"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import * as XLSX from "xlsx"
import { authClient } from "@/lib/auth-client"
import { getUserProfile } from "@/services/profiles"
import { getActiveAcademicYear } from "@/services/schools"
import { getAllStudentsForImport, getAllStudents, createStudent } from "@/services/students"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react"

interface RowData {
  nombre: string
  apellido: string
  dni: string
  curso: string
  division: string
}

type ImportStatus = "idle" | "preview" | "importing" | "done"

interface ImportResult {
  success: number
  errors: { row: number; message: string }[]
}

const REQUIRED_COLUMNS = ["nombre", "apellido", "dni", "curso", "division"]
const COLUMN_ALIASES: Record<string, string> = {
  nombres: "nombre",
  name: "nombre",
  names: "nombre",
  apellidos: "apellido",
  surname: "apellido",
  surnames: "apellido",
  lastname: "apellido",
  last_name: "apellido",
  document: "dni",
  documento: "dni",
  course: "curso",
  courses: "curso",
  divisiones: "division",
  división: "division",
  seccion: "division",
  section: "division",
}

function normalizeColumnName(header: string): string | null {
  const cleaned = header
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
  if (REQUIRED_COLUMNS.includes(cleaned)) return cleaned
  return COLUMN_ALIASES[cleaned] ?? null
}

export default function ImportStudentsPage() {
  const router = useRouter()
  const [status, setStatus] = useState<ImportStatus>("idle")
  const [rows, setRows] = useState<RowData[]>([])
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleFile(file: File) {
    setError(null)
    setResult(null)

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const json: Record<string, string>[] = XLSX.utils.sheet_to_json(sheet, {
          defval: "",
        })

        if (json.length === 0) {
          setError("El archivo está vacío")
          return
        }

        const headers = Object.keys(json[0])
        const mapped: Record<string, string> = {}
        let missing: string[] = []

        for (const h of headers) {
          const col = normalizeColumnName(h)
          if (col) mapped[col] = h
        }

        missing = REQUIRED_COLUMNS.filter((c) => !mapped[c])

        if (missing.length > 0) {
          setError(
            `Columnas requeridas no encontradas: ${missing.join(", ")}. ` +
              `Columnas detectadas: ${headers.join(", ")}`
          )
          return
        }

        const parsed: RowData[] = json.map((row, i) => ({
          nombre: String(row[mapped.nombre] ?? "").trim(),
          apellido: String(row[mapped.apellido] ?? "").trim(),
          dni: String(row[mapped.dni] ?? "").trim(),
          curso: String(row[mapped.curso] ?? "").trim(),
          division: String(row[mapped.division] ?? "").trim(),
        }))

        const valid = parsed.filter(
          (r) => r.nombre && r.apellido && r.dni
        )

        if (valid.length === 0) {
          setError("No se encontraron filas con nombre, apellido y DNI")
          return
        }

        setRows(valid)

        if (valid.length < parsed.length) {
          setError(
            `${parsed.length - valid.length} fila(s) omitida(s) por datos incompletos`
          )
        }

        setStatus("preview")
      } catch {
        setError("Error al leer el archivo. Asegurate de que sea un Excel válido.")
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleImport = useCallback(async () => {
    setStatus("importing")
    setResult(null)
    const results: ImportResult = { success: 0, errors: [] }

    const { data: sessionData } = await authClient.getSession()
    const user = sessionData?.user
    if (!user) {
      setError("No autenticado")
      setStatus("preview")
      return
    }

    const { profile } = await getUserProfile(user.id)

    if (!profile?.schoolId) {
      setError("Perfil sin institución asociada")
      setStatus("preview")
      return
    }

    const schoolId = profile.schoolId

    const academicYear = await getActiveAcademicYear(schoolId)
    const academicYearId = academicYear?.id ?? null

    const { divisionMap } = await getAllStudentsForImport(schoolId)
    const existingStudents = await getAllStudents(schoolId)
    const existingDnis = new Set(existingStudents.map((s) => s.dni))

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      try {
        if (existingDnis.has(row.dni)) {
          results.errors.push({ row: i + 1, message: `DNI ${row.dni} ya existe` })
          continue
        }

        const divKey = `${row.curso.toLowerCase().trim()}|${row.division.toLowerCase().trim()}`
        let divisionId: string | null = null

        if (row.curso && row.division) {
          divisionId = divisionMap.get(divKey) ?? null
          if (!divisionId) {
            results.errors.push({
              row: i + 1,
              message: `Curso/División no encontrado: ${row.curso} - ${row.division}`,
            })
            continue
          }
        }

        await createStudent({
          schoolId: schoolId,
          divisionId: divisionId,
          academicYearId: academicYearId,
          firstName: row.nombre,
          lastName: row.apellido,
          dni: row.dni,
        })

        results.success++
      } catch (err) {
        results.errors.push({
          row: i + 1,
          message: err instanceof Error ? err.message : "Error desconocido",
        })
      }
    }

    setResult(results)
    setStatus("done")
  }, [rows])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Importar Alumnos"
        description="Subí un archivo Excel con los datos de los alumnos"
      >
        <Button variant="ghost" onClick={() => router.push("/students")}>
          <ArrowLeft className="size-4" />
          Volver
        </Button>
      </PageHeader>

      {status === "idle" && (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12">
          <FileSpreadsheet className="mb-4 size-12 text-muted-foreground" />
          <p className="mb-2 text-sm font-medium">
            Seleccioná un archivo Excel (.xlsx)
          </p>
          <p className="mb-6 text-xs text-muted-foreground">
            Columnas requeridas: Nombre, Apellido, DNI, Curso, División
          </p>
          <label>
            <input
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFile(file)
              }}
            />
            <Button variant="outline" className="cursor-pointer">
              <Upload className="size-4" />
              Seleccionar archivo
            </Button>
          </label>
          {error && (
            <div className="mt-4 flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="size-4" />
              {error}
            </div>
          )}
        </div>
      )}

      {status === "preview" && (
        <>
          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {rows.length} alumno(s) listos para importar
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setStatus("idle")
                  setRows([])
                  setError(null)
                }}
              >
                Cancelar
              </Button>
              <Button onClick={handleImport} disabled={rows.length === 0}>
                <Upload className="size-4" />
                Importar {rows.length} alumno(s)
              </Button>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Apellido</TableHead>
                  <TableHead>DNI</TableHead>
                  <TableHead>Curso</TableHead>
                  <TableHead>División</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{row.nombre}</TableCell>
                    <TableCell>{row.apellido}</TableCell>
                    <TableCell>{row.dni}</TableCell>
                    <TableCell>{row.curso}</TableCell>
                    <TableCell>{row.division}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {status === "importing" && (
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <Loader2 className="size-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Importando alumnos...</p>
        </div>
      )}

      {status === "done" && result && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 rounded-lg border bg-card p-4">
            <CheckCircle2 className="size-5 text-green-600" />
            <p className="text-sm font-medium">
              Importación finalizada: {result.success} exitoso(s)
              {result.errors.length > 0 &&
                `, ${result.errors.length} error(es)`}
            </p>
          </div>

          {result.errors.length > 0 && (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fila</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.errors.map((e, i) => (
                    <TableRow key={i}>
                      <TableCell>{e.row}</TableCell>
                      <TableCell className="text-destructive">{e.message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <Button onClick={() => router.push("/students")}>
            Volver a Alumnos
          </Button>
        </div>
      )}
    </div>
  )
}
