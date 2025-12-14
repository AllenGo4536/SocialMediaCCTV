
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: Request) {
    try {
        const { email, password, inviteCode } = await req.json()

        if (!email || !password || !inviteCode) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // 1. Verify Invite Code
        const { data: codeData, error: codeError } = await supabaseAdmin
            .from('invite_codes')
            .select('id, is_used')
            .eq('code', inviteCode)
            .single()

        if (codeError || !codeData) {
            return NextResponse.json({ error: '无效的邀请码' }, { status: 400 })
        }

        if (codeData.is_used) {
            return NextResponse.json({ error: '邀请码已被使用' }, { status: 400 })
        }

        // 2. Create User
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true // Auto confirm for now as we trust the invite code wrapper
        })

        if (authError) {
            return NextResponse.json({ error: authError.message }, { status: 400 })
        }

        // 3. Mark Invite Code as Used
        const { error: updateError } = await supabaseAdmin
            .from('invite_codes')
            .update({
                is_used: true,
                used_by: authData.user.id,
                used_at: new Date().toISOString()
            })
            .eq('id', codeData.id)

        if (updateError) {
            console.error('Failed to mark invite code as used:', updateError)
            // We don't rollback user creation here for simplicity, but in a partial failure scenario we might want to.
            // Ideally we would use a transaction or edge function, but for this level of app it is fine.
        }



        return NextResponse.json({ success: true, user: authData.user })

    } catch (error: any) {
        console.error('Registration error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
