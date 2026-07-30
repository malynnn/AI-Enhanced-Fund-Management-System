import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';

// Path to the query_store python script
const QUERY_STORE_SCRIPT_PATH = path.resolve(process.cwd(), '..', 'backend', 'apps', 'data-extraction', 'query_store.py');

/**
 * AFMS-027: API Endpoint for Stored Analytics, Forecasts, Reports, & Audit Logs.
 * Retrieves saved storage module records from the SQLite analytics database.
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const queryType = searchParams.get('type') || 'all';

        const cmd = `py "${QUERY_STORE_SCRIPT_PATH}" --type ${queryType}`;

        const resultJson = await new Promise<string>((resolve, reject) => {
            const pythonPath = path.dirname(QUERY_STORE_SCRIPT_PATH);
            const analyticsDbPath = path.join(pythonPath, 'analytics.db');

            const env = {
                ...process.env,
                PYTHONPATH: pythonPath,
                ANALYTICS_DB_PATH: analyticsDbPath,
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
            throw new Error("No JSON object found in query output: " + resultJson);
        }
        const cleanJsonStr = resultJson.substring(jsonStartIndex);
        const parsedData = JSON.parse(cleanJsonStr);

        if (!parsedData.success) {
            return NextResponse.json(parsedData, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            message: `Stored ${queryType} analytics data retrieved successfully from SQLite database.`,
            timestamp: new Date().toISOString(),
            query_type: queryType,
            data: parsedData.data || {}
        });

    } catch (error: any) {
        return NextResponse.json({
            success: false,
            message: `Storage API Error: ${error.message}`
        }, { status: 500 });
    }
}

export async function POST(request: Request) {
    return GET(request);
}
