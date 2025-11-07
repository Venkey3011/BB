//==================================================
// Byte&Battle - Supabase Configuration
// Add this file to your project
//==================================================

// Install Supabase client: npm install @supabase/supabase-js

import { createClient } from '@supabase/supabase-js'

// Get these from Supabase Dashboard → Settings → API
const SUPABASE_URL = 'YOUR_SUPABASE_URL_HERE'
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY_HERE'

// Create Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

//==================================================
// AUTHENTICATION FUNCTIONS
//==================================================

// Sign up new user
export async function signUp(email, password, username) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                username: username
            }
        }
    })
    return { data, error }
}

// Sign in user
export async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    })
    return { data, error }
}

// Sign out
export async function signOut() {
    const { error } = await supabase.auth.signOut()
    return { error }
}

// Get current user
export async function getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
}

// Get user profile
export async function getUserProfile(userId) {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
    return { data, error }
}

//==================================================
// PROBLEMS FUNCTIONS
//==================================================

// Get all problems with filters
export async function getProblems(filters = {}) {
    let query = supabase
        .from('problems')
        .select('*')
        .order('id', { ascending: true })
    
    if (filters.difficulty) {
        query = query.eq('difficulty', filters.difficulty)
    }
    
    if (filters.tags) {
        query = query.contains('tags', filters.tags)
    }
    
    const { data, error } = await query
    return { data, error }
}

// Get single problem
export async function getProblem(id) {
    const { data, error } = await supabase
        .from('problems')
        .select('*')
        .eq('id', id)
        .single()
    return { data, error }
}

// Get test cases for a problem
export async function getTestCases(problemId, visibleOnly = false) {
    let query = supabase
        .from('test_cases')
        .select('*')
        .eq('problem_id', problemId)
    
    if (visibleOnly) {
        query = query.or('is_visible.eq.true,is_sample.eq.true')
    }
    
    const { data, error } = await query
    return { data, error }
}

// Create problem (admin only)
export async function createProblem(problemData) {
    const { data, error } = await supabase
        .from('problems')
        .insert([problemData])
        .select()
    return { data, error }
}

// Update problem (admin only)
export async function updateProblem(id, updates) {
    const { data, error } = await supabase
        .from('problems')
        .update(updates)
        .eq('id', id)
        .select()
    return { data, error }
}

// Delete problem (admin only)
export async function deleteProblem(id) {
    const { error } = await supabase
        .from('problems')
        .delete()
        .eq('id', id)
    return { error }
}

//==================================================
// SUBMISSIONS FUNCTIONS
//==================================================

// Submit code
export async function submitCode(userId, problemId, code, language) {
    const { data, error } = await supabase
        .from('submissions')
        .insert([{
            user_id: userId,
            problem_id: problemId,
            code: code,
            language: language,
            status: 'pending'
        }])
        .select()
    return { data, error }
}

// Get user submissions
export async function getUserSubmissions(userId, limit = 50) {
    const { data, error } = await supabase
        .from('submissions')
        .select('*, problems(title, difficulty)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)
    return { data, error }
}

// Update submission status (after code execution)
export async function updateSubmissionStatus(submissionId, status, results) {
    const { data, error } = await supabase
        .from('submissions')
        .update({
            status: status,
            execution_time: results.execution_time,
            memory_used: results.memory_used,
            test_cases_passed: results.passed,
            test_cases_total: results.total,
            error_message: results.error
        })
        .eq('id', submissionId)
        .select()
    return { data, error }
}

//==================================================
// LEADERBOARD FUNCTIONS
//==================================================

// Get global leaderboard
export async function getLeaderboard(limit = 100) {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, username, rating, solved_count, streak')
        .order('rating', { ascending: false })
        .limit(limit)
    return { data, error }
}

//==================================================
// CONTESTS FUNCTIONS
//==================================================

// Get all contests
export async function getContests(status = null) {
    let query = supabase
        .from('contests')
        .select('*')
        .order('start_time', { ascending: false })
    
    if (status) {
        query = query.eq('status', status)
    }
    
    const { data, error } = await query
    return { data, error }
}

// Get contest details
export async function getContest(id) {
    const { data, error } = await supabase
        .from('contests')
        .select('*')
        .eq('id', id)
        .single()
    return { data, error }
}

// Register for contest
export async function registerForContest(contestId, userId) {
    const { data, error } = await supabase
        .from('contest_participants')
        .insert([{
            contest_id: contestId,
            user_id: userId
        }])
        .select()
    return { data, error }
}

// Get contest leaderboard
export async function getContestLeaderboard(contestId) {
    const { data, error } = await supabase
        .from('contest_participants')
        .select('*, profiles(username)')
        .eq('contest_id', contestId)
        .order('score', { ascending: false })
    return { data, error }
}

//==================================================
// REAL-TIME SUBSCRIPTIONS
//==================================================

// Subscribe to contest updates
export function subscribeToContest(contestId, callback) {
    return supabase
        .channel(`contest:${contestId}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'contest_participants',
                filter: `contest_id=eq.${contestId}`
            },
            callback
        )
        .subscribe()
}

// Subscribe to leaderboard updates
export function subscribeToLeaderboard(callback) {
    return supabase
        .channel('leaderboard')
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'profiles'
            },
            callback
        )
        .subscribe()
}

//==================================================
// CODE EXECUTION (using Piston API - FREE)
//==================================================

export async function executeCode(code, language, testCases) {
    const results = []
    
    for (const testCase of testCases) {
        try {
            const response = await fetch('https://emkc.org/api/v2/piston/execute', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    language: language,
                    version: '*',
                    files: [{
                        content: code
                    }],
                    stdin: testCase.input,
                    compile_timeout: 10000,
                    run_timeout: 3000
                })
            })
            
            const result = await response.json()
            
            results.push({
                input: testCase.input,
                expected: testCase.expected_output,
                actual: result.run?.stdout?.trim() || '',
                passed: result.run?.stdout?.trim() === testCase.expected_output.trim(),
                error: result.run?.stderr || result.compile?.stderr || null,
                time: result.run?.time || 0
            })
        } catch (error) {
            results.push({
                input: testCase.input,
                expected: testCase.expected_output,
                actual: '',
                passed: false,
                error: error.message,
                time: 0
            })
        }
    }
    
    return {
        passed: results.filter(r => r.passed).length,
        total: results.length,
        results: results,
        execution_time: Math.max(...results.map(r => r.time)),
        memory_used: 0 // Piston doesn't provide memory info
    }
}

//==================================================
// STORAGE (for avatars, images)
//==================================================

// Upload avatar
export async function uploadAvatar(userId, file) {
    const fileExt = file.name.split('.').pop()
    const fileName = `${userId}.${fileExt}`
    
    const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
            upsert: true
        })
    
    if (error) return { data: null, error }
    
    const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)
    
    return { data: { url: publicUrl }, error: null }
}

//==================================================
// USAGE EXAMPLE
//==================================================

/*
import { supabase, signIn, getProblems, submitCode, executeCode } from './supabase-config.js'

// Sign in
const { data: user, error } = await signIn('user@example.com', 'password')

// Get problems
const { data: problems } = await getProblems({ difficulty: 'Easy' })

// Submit and execute code
const submission = await submitCode(user.id, 1, 'function twoSum...', 'javascript')
const testCases = await getTestCases(1, true)
const results = await executeCode(code, 'javascript', testCases.data)
await updateSubmissionStatus(submission.data[0].id, 'accepted', results)
*/