import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';

// Path to the analytics python script which runs the forecasting pipeline
const ANALYTICS_SCRIPT_PATH = path.resolve(process.cwd(), '..', 'backend', 'apps', 'data-extraction', 'analytics.py');

/**
 * AFMS-022: API Endpoint for AI 60-Day Forecasting & Reallocation Recommendations.
 * Returns trained model status, 60-day forecasts, shortage alerts, rule-based recommendations,
 * and fund reallocation decision reports.
 */
export async function GET(request: Request) {
    try {
        const cmd = `py "${ANALYTICS_SCRIPT_PATH}"`;

        const resultJson = await new Promise<string>((resolve, reject) => {
            const pythonPath = path.dirname(ANALYTICS_SCRIPT_PATH);
            const analyticsDbPath   = path.join(pythonPath, 'analytics.db');
            const analyticsReportPath = path.join(pythonPath, 'analytics_report.json');

            const env = { 
                ...process.env, 
                PYTHONPATH:             pythonPath,
                ANALYTICS_DB_PATH:      analyticsDbPath,
                ANALYTICS_REPORT_PATH:  analyticsReportPath,
                GROQ_API_KEY:           process.env.GROQ_API_KEY || ""
            };

            exec(cmd, { env }, (error, stdout, stderr) => {
                if (error && !stdout) {
                    reject(new Error(stderr || error.message));
                } else {
                    resolve(stdout);
                }
            });
        });

        const jsonStartIndex = resultJson.indexOf('{');
        if (jsonStartIndex === -1) {
            throw new Error("No JSON object found in output: " + resultJson);
        }
        const cleanJsonStr = resultJson.substring(jsonStartIndex);
        const parsedData = JSON.parse(cleanJsonStr);

        if (!parsedData.success) {
            return NextResponse.json(parsedData, { status: 500 });
        }

        const data = parsedData.data || {};

        return NextResponse.json({
            success: true,
            message: "60-Day AI Forecasting and Decision Support predictions generated successfully.",
            timestamp: new Date().toISOString(),
            storage_stats: parsedData.storage_stats || {},
            model_config: data.model_config || {},
            forecasts: data.forecasts || [],
            forecast_timeline: data.trends?.forecast_timeline || [],
            shortage_alerts: data.shortage_alerts || [],
            recommendations: data.recommendations || [],
            reallocation_report: data.reallocation_report || {},
            audit_logs: data.audit_logs || []
        });

    } catch (error: any) {
        return NextResponse.json({
            success: false,
            message: `Predict API Error: ${error.message}`
        }, { status: 500 });
    }
}

export async function POST(request: Request) {
    return GET(request);
}
