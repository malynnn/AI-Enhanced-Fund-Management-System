import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

// Path to python script
const EXTRACTOR_SCRIPT_PATH = path.resolve(process.cwd(), '..', 'backend', 'apps', 'data-extraction', 'main.py');

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { source, dbConfig, csvData } = body;

        let cmd = `py "${EXTRACTOR_SCRIPT_PATH}" --source ${source}`;
        const tempFiles: string[] = [];

        // 1. Database Connection Config Overrides
        if (source === 'db' && dbConfig) {
            const { host, port, database, user, password } = dbConfig;
            if (host) cmd += ` --host "${host}"`;
            if (port) cmd += ` --port "${port}"`;
            if (database) cmd += ` --database "${database}"`;
            if (user) cmd += ` --user "${user}"`;
            if (password) cmd += ` --password "${password}"`;
        }

        // 2. CSV File Import Config
        if (source === 'csv') {
            if (!csvData || !csvData.funds || !csvData.transactions) {
                return NextResponse.json({ 
                    success: false, 
                    message: "Missing CSV data. Both funds and transactions CSV data are required." 
                }, { status: 400 });
            }

            // Create temporary files for the CSV contents
            const tempDir = os.tmpdir();
            const fundsPath = path.join(tempDir, `fms_funds_${Date.now()}.csv`);
            const txPath = path.join(tempDir, `fms_tx_${Date.now()}.csv`);

            fs.writeFileSync(fundsPath, csvData.funds);
            fs.writeFileSync(txPath, csvData.transactions);

            tempFiles.push(fundsPath, txPath);

            cmd += ` --funds-csv "${fundsPath}" --tx-csv "${txPath}"`;
        }

        // Execute the python script
        const resultJson = await new Promise<string>((resolve, reject) => {
            // Set PYTHONPATH so python can resolve local module imports (e.g. config.py, db_connection.py)
            const pythonPath = path.dirname(EXTRACTOR_SCRIPT_PATH);
            // Use absolute paths for output files so they always land inside
            // the data-extraction folder regardless of the process working directory
            const analyticsDbPath   = path.join(pythonPath, 'analytics.db');
            const extractionLogPath = path.join(pythonPath, 'extraction_log.json');
            const env = { 
                ...process.env, 
                PYTHONPATH:           pythonPath,
                ANALYTICS_DB_PATH:    analyticsDbPath,
                EXTRACTION_LOG_PATH:  extractionLogPath,
            };

            exec(cmd, { env }, (error, stdout, stderr) => {
                // Always clean up temp files first
                for (const file of tempFiles) {
                    try {
                        if (fs.existsSync(file)) {
                            fs.unlinkSync(file);
                        }
                    } catch (e) {
                        console.error("Failed to delete temp file:", file, e);
                    }
                }

                if (error) {
                    console.error("Execution error:", error);
                    console.error("Stderr:", stderr);
                    // Standard main.py output should be JSON, but if python failed to launch or crashed, capture stdout
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
            // Remove any potential warnings before the JSON block
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
                message: `Failed to parse Python script output: ${parseError.message}`,
                raw_output: resultJson
            }, { status: 500 });
        }

    } catch (error: any) {
        return NextResponse.json({
            success: false,
            message: `API Route Error: ${error.message}`
        }, { status: 500 });
    }
}
