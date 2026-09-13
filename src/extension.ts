import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    let panel: vscode.WebviewPanel | undefined = undefined;

    let disposable = vscode.commands.registerCommand('arch-visualizer.openVisualizer', () => {
        const editor = vscode.window.activeTextEditor;

        if (panel) {
            panel.reveal(vscode.ViewColumn.Two);
        } else {
            panel = vscode.window.createWebviewPanel(
                'archVisualizer',
                'Architecture Visualizer',
                vscode.ViewColumn.Two,
                {
                    enableScripts: true
                }
            );

            panel.onDidDispose(
                () => {
                    panel = undefined;
                },
                null,
                context.subscriptions
            );
        }

        const initialText = editor ? editor.document.getText() : getDefaultDiagram();
        panel.webview.html = getWebviewContent(initialText);
    });

    vscode.workspace.onDidChangeTextDocument(event => {
        if (panel && vscode.window.activeTextEditor && event.document === vscode.window.activeTextEditor.document) {
            const text = event.document.getText();
            panel.webview.postMessage({ command: 'updateDiagram', content: text });
        }
    });

    context.subscriptions.push(disposable);
}

function getDefaultDiagram(): string {
    return `graph TD
    User[User Request] --> API[API Gateway]
    API --> ServiceA[Auth Service]
    API --> ServiceB[Data Processing Core]
    ServiceB --> DB[(Database Cluster)]`;
}

function getWebviewContent(initialContent: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Architecture Visualizer</title>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
    <style>
        body {
            font-family: var(--vscode-font-family);
            padding: 0;
            margin: 0;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            display: flex;
            flex-direction: column;
            height: 100vh;
            overflow: hidden;
        }
        .toolbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background-color: var(--vscode-editorWidget-background);
            padding: 8px 16px;
            border-bottom: 1px solid var(--vscode-widget-border);
        }
        .toolbar h3 {
            margin: 0;
            font-size: 14px;
            color: var(--vscode-textLink-activeForeground);
        }
        .actions {
            display: flex;
            gap: 8px;
        }
        button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 4px 12px;
            border-radius: 2px;
            cursor: pointer;
            font-size: 12px;
        }
        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        #error-box {
            color: var(--vscode-errorForeground);
            background: var(--vscode-inputValidation-errorBackground);
            padding: 6px 12px;
            font-size: 12px;
            display: none;
            border-bottom: 1px solid var(--vscode-widget-border);
        }
        #diagram-container {
            flex: 1;
            display: flex;
            justify-content: center;
            align-items: center;
            overflow: auto;
            padding: 20px;
        }
    </style>
</head>
<body>
    <div class="toolbar">
        <h3>Architecture Visualizer</h3>
        <div class="actions">
            <button onclick="exportSVG()">Export SVG</button>
        </div>
    </div>
    <div id="error-box">Syntax Error in Mermaid Definition</div>
    <div id="diagram-container">
        <pre class="mermaid" id="mermaid-target">
${initialContent}
        </pre>
    </div>

    <script>
        mermaid.initialize({
            startOnLoad: true,
            theme: 'dark'
        });

        const errorBox = document.getElementById('error-box');

        window.addEventListener('message', async event => {
            const message = event.data;
            if (message.command === 'updateDiagram') {
                const container = document.getElementById('diagram-container');
                try {
                    errorBox.style.display = 'none';
                    const { svg } = await mermaid.render('rendered-svg-' + Date.now(), message.content);
                    container.innerHTML = svg;
                } catch (err) {
                    errorBox.style.display = 'block';
                }
            }
        });

        function exportSVG() {
            const svgElement = document.querySelector('#diagram-container svg');
            if (!svgElement) {
                return;
            }
            const svgData = new XMLSerializer().serializeToString(svgElement);
            const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const downloadLink = document.createElement('a');
            downloadLink.href = url;
            downloadLink.download = 'architecture-diagram.svg';
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
        }
    </script>
</body>
</html>`;
}

export function deactivate() {}