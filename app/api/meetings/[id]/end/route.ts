import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase-admin'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params

    if (!id) {
      return NextResponse.json({ error: 'Meeting id is required' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    const { data: current, error: currentError } = await supabase
      .from('meeting_sessions')
      .select('*')
      .eq('id', id)
      .single()

    if (currentError || !current) {
      return NextResponse.json({ error: 'Meeting session not found' }, { status: 404 })
    }

    if (current.status === 'ended') {
      return NextResponse.json(
        { error: 'Meeting session is already ended', session: current },
        { status: 409 }
      )
    }

    const { data, error } = await supabase
      .from('meeting_sessions')
      .update({
        status: 'ended',
        ended_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ session: data })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
