
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

async function createAdmin() {
    if (!supabaseUrl) {
        console.error('Missing NEXT_PUBLIC_SUPABASE_URL')
        process.exit(1)
    }

    // Try service key first/
    let supabase
    let isAdmin = false

    if (supabaseServiceKey) {
        console.log('Using Service Role Key (Admin mode)...')
        supabase = createClient(supabaseUrl, supabaseServiceKey)
        isAdmin = true
    } else if (supabaseAnonKey) {
        console.log('Using Anon Key (Normal mode) - Email confirmation might be required...')
        supabase = createClient(supabaseUrl, supabaseAnonKey)
    } else {
        console.error('Missing Supabase Keys')
        process.exit(1)
    }

    const email = 'admin@example.com'
    const password = 'kpqi0408'
    const name = 'Admin User'

    if (isAdmin) {
        // Admin creation (auto confirm)
        const { data, error } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: name, role: 'admin' }
        })

        if (error) {
            console.error('Error creating user:', error.message)
        } else {
            console.log('Admin user created successfully (Auto-confirmed)!')
            console.log('Email:', email)
            console.log('Password:', password)
        }
    } else {
        // Regular signup
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: name, role: 'admin' }
            }
        })

        if (error) {
            // If user already exists, it might return error or data with user but empty session
            console.error('Error signing up:', error.message)
        } else {
            console.log('User signed up successfully!')
            if (data.session) {
                console.log('Session created (Auto-confirmed or not required).')
            } else if (data.user) {
                console.log('User created, but email confirmation required.')
                console.log('Please check your email (or Inbucket http://localhost:54324) to confirm.')
            }
            console.log('Email:', email)
            console.log('Password:', password)
        }
    }
}

createAdmin()
