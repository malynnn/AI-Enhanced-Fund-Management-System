import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';

// Path to the python script
const ANALYTICS_SCRIPT_PATH = path.resolve(process.cwd(), '..', 'backend', 'apps', 'data-extraction', 'analytics.py');

export async function POST(request: Request) {
    try {
        let cmd = `py "${ANALYTICS_SCRIPT_PATH}"`;

        const resultJson = await new Promise<string>((resolve, reject) => {
            const pythonPath = path.dirname(ANALYTICS_SCRIPT_PATH);
            const analyticsDbPath   = path.join(pythonPath, 'analytics.db');
            const analyticsReportPath = path.join(pythonPath, 'analytics_report.json');

            const env = { 
                ...process.env, 
                PYTHONPATH:             pythonPath,
                ANALYTICS_DB_PATH:      analyticsDbPath,
                ANALYTICS_REPORT_PATH:  analyticsReportPath,
            };

            exec(cmd, { env }, (error, stdout, stderr) => {
                if (error) {
                    console.error("Analytics execution error:", error);
                    console.error("Stderr:", stderr);
                    // Standard analytics.py output should be JSON, but if python failed to launch or crashed, capture stdout
                    if (stdout) {
                        resolve(stdout);
                    } else {
                        reject(new Error(stderr || error.message));
                    }
                } else {
                    resolve(stdout);
                }
            });
        });

        // Parse stdout JSON
        try {
            const jsonStartIndex = resultJson.indexOf('{');
            if (jsonStartIndex === -1) {
                throw new Error("No JSON object found in output: " + resultJson);
            }
            const cleanJsonStr = resultJson.substring(jsonStartIndex);
            const parsedData = JSON.parse(cleanJsonStr);
            return NextResponse.json(parsedData);
        } catch (parseError: any) {
            return NextResponse.json({
                success: false,
                message: `Failed to parse Python analytics output: ${parseError.message}`,
                raw_output: resultJson
            }, { status: 500 });
        }

    } catch (error: any) {
        return NextResponse.json({
            success: false,
            message: `Analytics API Route Error: ${error.message}`
        }, { status: 500 });
    }
}
