
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
            .select('id, is_used, max_uses, uses_count')
            .eq('code', inviteCode)
            .single()

        if (codeError || !codeData) {
            return NextResponse.json({ error: '无效的邀请码' }, { status: 400 })
        }

        // Check limits
        if (codeData.uses_count >= codeData.max_uses) {
             return NextResponse.json({ error: '邀请码已达到最大使用次数' }, { status: 400 })
        }

        // 2. Create User
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true 
        })

        if (authError) {
            return NextResponse.json({ error: authError.message }, { status: 400 })
        }

        // 3. Record Usage
        // Insert into usage history
        const { error: usageError } = await supabaseAdmin
            .from('invite_usages')
            .insert({
                invite_code_id: codeData.id,
                user_id: authData.user.id
            })
            
        if (usageError) {
             console.error('Failed to record invite usage:', usageError)
        }

        // Increment count
        const { error: updateError } = await supabaseAdmin
            .from('invite_codes')
            .update({
                uses_count: codeData.uses_count + 1,
                // Keep is_used for backward compatibility or simple checks if needed, 
                // but strictly speaking we rely on counts now. 
                // Let's set is_used to true if it reaches max just in case.
                is_used: (codeData.uses_count + 1) >= codeData.max_uses
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
