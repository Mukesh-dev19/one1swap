import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ADMIN_USERNAME = 'admin'
const ADMIN_PASSCODE = '192008'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { action, username, passcode, ...params } = body

    if (username !== ADMIN_USERNAME || passcode !== ADMIN_PASSCODE) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    let data: any = null

    switch (action) {
      case 'login':
        data = { success: true }
        break

      case 'getOverview': {
        const { count: totalUsers } = await supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true })
        const { count: activeUsers } = await supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).eq('is_blocked', false)
        const { count: totalResources } = await supabaseAdmin.from('resources').select('*', { count: 'exact', head: true })
        const { data: recentUsers } = await supabaseAdmin.from('profiles').select('full_name, created_at').order('created_at', { ascending: false }).limit(5)
        const { data: recentResources } = await supabaseAdmin.from('resources').select('title, created_at').order('created_at', { ascending: false }).limit(5)
        data = { totalUsers, activeUsers, totalResources, recentUsers, recentResources }
        break
      }

      case 'getUsers': {
        const { data: profiles } = await supabaseAdmin.from('profiles').select('*').order('created_at', { ascending: false })
        const { data: { users: authUsers } } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1000 })
        const { data: resources } = await supabaseAdmin.from('resources').select('user_id')

        const uploadCounts: Record<string, number> = {}
        resources?.forEach((r: any) => { uploadCounts[r.user_id] = (uploadCounts[r.user_id] || 0) + 1 })

        const emailMap: Record<string, string> = {}
        authUsers?.forEach((u: any) => { emailMap[u.id] = u.email || '' })

        data = profiles?.map((p: any) => ({
          ...p,
          email: emailMap[p.user_id] || '',
          upload_count: uploadCounts[p.user_id] || 0,
        }))
        break
      }

      case 'blockUser': {
        const { userId } = params
        await supabaseAdmin.from('profiles').update({ is_blocked: true }).eq('user_id', userId)
        data = { success: true }
        break
      }

      case 'unblockUser': {
        const { userId } = params
        await supabaseAdmin.from('profiles').update({ is_blocked: false }).eq('user_id', userId)
        data = { success: true }
        break
      }

      case 'deleteUser': {
        const { userId } = params
        await supabaseAdmin.auth.admin.deleteUser(userId)
        data = { success: true }
        break
      }

      case 'getResources': {
        const { data: resources } = await supabaseAdmin.from('resources').select('*').order('created_at', { ascending: false })
        const { data: profiles } = await supabaseAdmin.from('profiles').select('user_id, full_name')
        const nameMap: Record<string, string> = {}
        profiles?.forEach((p: any) => { nameMap[p.user_id] = p.full_name || 'Unknown' })
        data = resources?.map((r: any) => ({ ...r, user_name: nameMap[r.user_id] || 'Unknown' }))
        break
      }

      case 'deleteResource': {
        const { resourceId } = params
        await supabaseAdmin.from('resources').delete().eq('id', resourceId)
        data = { success: true }
        break
      }

      case 'getAnalytics': {
        const { data: profiles } = await supabaseAdmin.from('profiles').select('created_at').order('created_at')
        const monthCounts: Record<string, number> = {}
        profiles?.forEach((p: any) => {
          const month = p.created_at.substring(0, 7)
          monthCounts[month] = (monthCounts[month] || 0) + 1
        })
        const userGrowth = Object.entries(monthCounts).map(([month, count]) => ({ month, count }))

        const { data: resources } = await supabaseAdmin.from('resources').select('category')
        const catCounts: Record<string, number> = {}
        resources?.forEach((r: any) => { catCounts[r.category] = (catCounts[r.category] || 0) + 1 })
        const categories = Object.entries(catCounts).map(([name, count]) => ({ name, count }))

        data = { userGrowth, categories }
        break
      }

      case 'getAnnouncements': {
        const { data: announcements } = await supabaseAdmin
          .from('announcements')
          .select('*')
          .order('created_at', { ascending: false })
        data = announcements || []
        break
      }

      case 'createAnnouncement': {
        const { title, message, type, target_college, target_department } = params
        if (!title || !message) {
          return new Response(JSON.stringify({ error: 'Missing fields' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
        const { data: created, error } = await supabaseAdmin
          .from('announcements')
          .insert({
            title,
            message,
            type: type || 'info',
            is_active: true,
            target_college: target_college?.trim() || null,
            target_department: target_department?.trim() || null,
          })
          .select()
          .single()
        if (error) throw error
        data = created
        break
      }

      case 'toggleAnnouncement': {
        const { announcementId, isActive } = params
        await supabaseAdmin.from('announcements').update({ is_active: isActive }).eq('id', announcementId)
        data = { success: true }
        break
      }

      case 'deleteAnnouncement': {
        const { announcementId } = params
        await supabaseAdmin.from('announcements').delete().eq('id', announcementId)
        data = { success: true }
        break
      }

      case 'getActivityLogs': {
        const { data: recentUsers } = await supabaseAdmin.from('profiles').select('full_name, created_at').order('created_at', { ascending: false }).limit(30)
        const { data: recentResources } = await supabaseAdmin.from('resources').select('title, created_at').order('created_at', { ascending: false }).limit(30)

        const logs = [
          ...(recentUsers?.map((u: any) => ({ type: 'registration', description: `${u.full_name || 'Unknown'} registered`, timestamp: u.created_at })) || []),
          ...(recentResources?.map((r: any) => ({ type: 'upload', description: `Resource "${r.title}" uploaded`, timestamp: r.created_at })) || []),
        ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

        data = logs
        break
      }

      default:
        return new Response(JSON.stringify({ error: 'Unknown action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
