import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { supabase } from '@/lib/supabaseClient';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import { BusinessType, Tone, Purpose } from '@/types';
import { buildSystemPrompt, buildUserPrompt } from './prompts';

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { businessType, content, tone, purpose } = body;

        // 1. Visitor ID handling
        const cookieStore = await cookies();
        let visitorId = cookieStore.get('visitor_id')?.value;

        if (!visitorId) {
            visitorId = uuidv4();
            // In a real app we would set the cookie here, but doing it in Middleware is better
            // For this API route, we can just use the generated ID, but we should inform the client
            // or set-cookie header in response.
        }

        // 2. Check Daily Limit (Free: 3 times)
        const today = new Date().toISOString().split('T')[0];
        // This query is simplified. Accurate daily count needs range check.
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const { count, error: countError } = await supabase
            .from('generations')
            .select('*', { count: 'exact', head: true })
            .eq('visitor_id', visitorId)
            .gte('created_at', startOfDay.toISOString());

        if (countError) console.error('Count error:', countError);

        const usageCount = count || 0;

        // Check if user is admin (bypass all limits)
        const { data: profile } = await supabase
            .from('profiles')
            .select('email')
            .eq('id', visitorId)
            .single();

        const isAdmin = profile?.email === process.env.ADMIN_EMAIL;

        // Check if user has active subscription
        const { data: subscription } = await supabase
            .from('subscriptions')
            .select('status')
            .eq('visitor_id', visitorId)
            .eq('status', 'active')
            .single();

        const isPremium = !!subscription;

        // Admin has unlimited access, skip limit check
        if (!isAdmin && !isPremium && usageCount >= 3) {
            // Limit reached
            return NextResponse.json(
                { error: 'Free limit reached', limitReached: true },
                { status: 403 }
            );
        }

        // 3. Call OpenAI with optimized prompts
        const systemPrompt = buildSystemPrompt(businessType as BusinessType);
        const userPrompt = buildUserPrompt({
            industry: businessType as BusinessType,
            content,
            tone: tone as Tone,
            purpose: purpose as Purpose
        });

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            temperature: 0.9, // Higher temperature for more creative, natural output
            top_p: 0.95, // Slightly lower top_p for better quality
            frequency_penalty: 0.3, // Reduce repetition
            presence_penalty: 0.2, // Encourage diverse vocabulary
            response_format: {
                type: "json_schema",
                json_schema: {
                    name: "instagram_post",
                    schema: {
                        type: "object",
                        properties: {
                            caption: { type: "string" },
                            hashtags: { type: "array", items: { type: "string" } },
                            storyPhrases: { type: "array", items: { type: "string" } },
                            engagementQuestion: { type: "string" }
                        },
                        required: ["caption", "hashtags", "storyPhrases", "engagementQuestion"],
                        additionalProperties: false
                    },
                    strict: true
                }
            }
        });

        const resultValid = completion.choices[0].message.content;
        if (!resultValid) throw new Error('No content from OpenAI');

        const resultJson = JSON.parse(resultValid);

        // 4. Save to Supabase
        const { data: insertedData, error: insertError } = await supabase
            .from('generations')
            .insert({
                visitor_id: visitorId,
                industry: businessType,
                tone: tone,
                goal: purpose,
                input_text: content,
                result_json: resultJson
            })
            .select()
            .single();

        if (insertError) throw new Error(insertError.message);

        const response = NextResponse.json(insertedData);

        // Set cookie if it was new
        if (!cookieStore.get('visitor_id')) {
            response.cookies.set('visitor_id', visitorId, {
                httpOnly: true,
                path: '/',
                maxAge: 60 * 60 * 24 * 365 // 1 year
            });
        }

        return response;

    } catch (error: any) {
        console.error('Error in generate:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
