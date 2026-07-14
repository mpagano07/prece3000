import { join } from "path"

// Cargar variables de entorno desde .env.local de manera segura antes de cargar otros módulos
try {
  // @ts-ignore
  if (typeof process.loadEnvFile === "function") {
    process.loadEnvFile(join(process.cwd(), ".env.local"))
  }
} catch (e) {
  console.warn("Advertencia: No se pudo cargar .env.local mediante process.loadEnvFile", e)
}

async function main() {
  const email = "matias.pagano07@gmail.com"
  const password = process.argv[2]

  if (!password) {
    console.error("❌ Error: Debes proporcionar una contraseña como argumento.")
    console.log("Ejemplo: npx tsx scripts/create-superadmin.ts MiContraseñaSuperSegura123")
    process.exit(1)
  }

  const firstName = "Matias"
  const lastName = "Pagano"

  console.log("--------------------------------------------------")
  console.log("Creando usuario super_admin en Neon...")
  console.log(`Email: ${email}`)
  console.log(`Nombre: ${firstName} ${lastName}`)
  console.log("--------------------------------------------------")

  try {
    // Importación dinámica para asegurar que se hayan cargado las variables de entorno antes de inicializar la DB
    const { auth } = await import("@/lib/auth")
    const { db } = await import("@/lib/db")
    const { profiles } = await import("@/lib/db/schema")
    const { eq, or, sql } = await import("drizzle-orm")

    // 0. Asegurar que las columnas del plugin admin de Better Auth existan en la tabla "user" de la base de datos
    console.log("Asegurando columnas del plugin admin en la tabla 'user'...")
    await db.execute(sql`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "role" text;`)
    await db.execute(sql`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "banned" boolean;`)
    await db.execute(sql`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "banReason" text;`)
    await db.execute(sql`ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "banExpires" timestamp with time zone;`)
    
    console.log("Asegurando columnas en la tabla 'session'...")
    await db.execute(sql`ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "createdAt" timestamp NOT NULL DEFAULT now();`)
    await db.execute(sql`ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp NOT NULL DEFAULT now();`)
    
    console.log("Columnas de admin y session verificadas/creadas con éxito.")

    // 1. Limpiar perfiles antiguos malformados o duplicados
    console.log("Limpiando perfiles previos si existen...")
    await db.delete(profiles).where(
      or(
        eq(profiles.id, "30a21ad2-bccb-4640-a25f-6c4472b4d8f6" as any),
        eq(profiles.email, email),
        // Eliminar el perfil con el email malformado que tiene basura del portapapeles
        eq(profiles.email, "matias.pagano07@gmail.          ⬖ Getting started                ✕    \n     com")
      )
    )

    // 2. Verificar si el usuario ya existe en Better Auth usando raw SQL
    console.log("Verificando si el usuario ya existe en Better Auth...")
    const result = await db.execute(sql`SELECT id FROM "user" WHERE email = ${email}`)
    let existingUser = result.rows[0] as { id: string } | undefined

    const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)

    if (existingUser && !isUUID(existingUser.id)) {
      console.log(`El usuario existente tiene un ID no-UUID (${existingUser.id}). Eliminándolo para recrear con UUID...`)
      await db.execute(sql`DELETE FROM "user" WHERE id = ${existingUser.id}`)
      existingUser = undefined
    }

    let userId: string

    if (existingUser) {
      console.log(`El usuario ya existe en Better Auth (ID: ${existingUser.id}). Reusando ID...`)
      userId = existingUser.id
    } else {
      console.log("Creando usuario en Better Auth...")
      const authUser = await auth.api.createUser({
        body: {
          email,
          password,
          name: `${firstName} ${lastName}`,
        },
      })
      userId = authUser.user.id
      console.log(`Usuario creado en Better Auth con ID: ${userId}`)
    }

    // 3. Crear el perfil de super_admin asociado a este usuario
    console.log("Creando perfil de super_admin en la tabla profiles...")
    await db.insert(profiles).values({
      id: userId as any,
      schoolId: null,
      role: "super_admin",
      firstName,
      lastName,
      email,
    }).onConflictDoUpdate({
      target: profiles.id,
      set: { role: "super_admin", email },
    })

    console.log("✅ ¡Superusuario creado con éxito!")
    console.log(`Ahora puedes iniciar sesión con:`)
    console.log(`📧 Email: ${email}`)
    console.log(`🔑 Contraseña: [La contraseña que ingresaste]`)
    console.log("--------------------------------------------------")
  } catch (error) {
    console.error("❌ Ocurrió un error durante la creación:", error)
  }
}

main().catch(console.error)
