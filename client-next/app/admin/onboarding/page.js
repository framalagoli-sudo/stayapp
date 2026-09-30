'use client'
import AdminLayout from '@/components/admin/AdminLayout'
import IniziaQui from '@/components/admin/IniziaQui'
// È qui che porta l'email di benvenuto della registrazione: prima dava 404.
export default function Page() { return <AdminLayout><div style={{ maxWidth: 760 }}><IniziaQui pagina /></div></AdminLayout> }
